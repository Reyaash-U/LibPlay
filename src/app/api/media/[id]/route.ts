import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { deleteFromCloudinary } from "@/lib/cloudinary";

// PATCH /api/media/[id] - Approve or reject media (librarian only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "LIBRARIAN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only librarians can approve/reject media" },
        { status: 403 }
      );
    }

    const { status } = await request.json();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    const { MongoClient, ObjectId } = require("mongodb");
    const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/libplay";
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("libplay");

    const objectId = new ObjectId(params.id);
    await db.collection("media").updateOne(
      { _id: objectId },
      { $set: { status, updatedAt: new Date() } }
    );

    const rawMedia = await db.collection("media").findOne({ _id: objectId });
    let uploader = null;
    if (rawMedia && rawMedia.userId) {
       uploader = await db.collection("users").findOne({ _id: new ObjectId(rawMedia.userId) });
    }

    const media = rawMedia ? {
      ...rawMedia,
      id: rawMedia._id.toString(),
      _id: undefined,
      uploadedBy: uploader ? { id: uploader._id.toString(), name: uploader.name, email: uploader.email } : null
    } : null;

    await client.close();

    return NextResponse.json({
      success: true,
      data: media,
      message: `Media ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("Update media error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update media" },
      { status: 500 }
    );
  }
}

// DELETE /api/media/[id] - Delete media (librarian only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Temporarily allowing all deletions as per user request
    /*
    if (user.role !== "LIBRARIAN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only librarians can delete media" },
        { status: 403 }
      );
    }
    */

    // Get media to find Cloudinary public ID
    const { MongoClient, ObjectId } = require("mongodb");
    const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/libplay";
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("libplay");

    const objectId = new ObjectId(params.id);
    const media = await db.collection("media").findOne({ _id: objectId });

    if (!media) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 }
      );
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(
        media.publicId,
        media.type === "VIDEO" ? "video" : "image"
      );
    } catch (cloudError) {
      console.error("Cloudinary delete error:", cloudError);
      // Continue with DB deletion even if Cloudinary fails
    }

    // Delete from database
    await db.collection("media").deleteOne({ _id: objectId });
    await client.close();

    return NextResponse.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    console.error("Delete media error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete media" },
      { status: 500 }
    );
  }
}

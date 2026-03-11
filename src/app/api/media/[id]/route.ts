import { NextRequest, NextResponse } from "next/server";
import { getDb, ObjectId } from "@/lib/mongodb";
import { getUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

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

    const db = await getDb();
    const objectId = new ObjectId(params.id);

    await db.collection("media").updateOne(
      { _id: objectId },
      { $set: { status, updatedAt: new Date() } }
    );

    const rawMedia = await db.collection("media").findOne({ _id: objectId });
    let uploader = null;
    if (rawMedia?.userId) {
      uploader = await db
        .collection("users")
        .findOne({ _id: new ObjectId(rawMedia.userId as string) });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const media = rawMedia
      ? {
          ...(rawMedia as any),
          id: rawMedia._id.toString(),
          _id: undefined,
          uploadedBy: uploader
            ? { id: uploader._id.toString(), name: uploader.name, email: uploader.email }
            : null,
        }
      : null;

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

// DELETE /api/media/[id] - Delete media (librarian or admin)
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

    if (user.role !== "LIBRARIAN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only librarians can delete media" },
        { status: 403 }
      );
    }

    const db = await getDb();
    const objectId = new ObjectId(params.id);
    const media = await db.collection("media").findOne({ _id: objectId });

    if (!media) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 }
      );
    }

    // Delete physical file — check private storage first, then legacy public/uploads/
    if (media.publicId) {
      const safeFilename = path.basename(media.publicId as string);
      const privateFilePath = path.join(process.cwd(), "storage", "uploads", safeFilename);
      const publicFilePath = path.join(process.cwd(), "public", "uploads", safeFilename);
      if (fs.existsSync(privateFilePath)) {
        fs.unlinkSync(privateFilePath);
      } else if (fs.existsSync(publicFilePath)) {
        fs.unlinkSync(publicFilePath);
      }
    }

    // Delete metadata from database
    await db.collection("media").deleteOne({ _id: objectId });

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

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only staff can upload media" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const eventName = formData.get("eventName") as string | null;
    const eventDate = formData.get("eventDate") as string | null;

    if (!file || !title) {
      return NextResponse.json(
        { success: false, error: "File and title are required" },
        { status: 400 }
      );
    }

    // Determine media type
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { success: false, error: "Only image and video files are allowed" },
        { status: 400 }
      );
    }

    // Check file size (1GB limit)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size must be under 1GB" },
        { status: 400 }
      );
    }

    // Convert to buffer for local filesystem upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const uniqueId = crypto.randomUUID();
    const extension = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const filename = `${uniqueId}.${extension}`;
    
    // Ensure the uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Save to local filesystem
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    const result = {
      url: `/uploads/${filename}`,
      thumbnailUrl: null, // Basic local integration lacks automatic transcoding
      publicId: filename,
      bytes: file.size,
      duration: null
    };

    // Save to database using Native Mongo driver
    const { MongoClient, ObjectId } = require("mongodb");
    const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/libplay";
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("libplay");

    const newMediaDoc = {
      title,
      description,
      type: isVideo ? "VIDEO" : "PHOTO",
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      publicId: result.publicId,
      status: "PENDING",
      eventName,
      eventDate,
      fileSize: result.bytes,
      duration: result.duration,
      userId: user.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertResult = await db.collection("media").insertOne(newMediaDoc);
    
    // Simulate Prisma `include` 
    const uploader = await db.collection("users").findOne({ _id: new ObjectId(user.userId) });
    
    const media = {
      ...newMediaDoc,
      id: insertResult.insertedId.toString(),
      _id: undefined,
      uploadedBy: uploader ? { id: uploader._id.toString(), name: uploader.name, email: uploader.email } : null
    };

    await client.close();

    return NextResponse.json({
      success: true,
      data: media,
      message: "Media uploaded successfully. Waiting for librarian approval.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload media";
    const isCloudinaryError = message.includes("cloud_name") || message.includes("Must supply");
    return NextResponse.json(
      {
        success: false,
        error: isCloudinaryError
          ? "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file."
          : message,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

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

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File size must be under 100MB" },
        { status: 400 }
      );
    }

    // Convert to buffer for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, {
      resourceType: isVideo ? "video" : "image",
      folder: `lib-play/${isVideo ? "videos" : "photos"}`,
    });

    // Save to database
    const media = await prisma.media.create({
      data: {
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
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

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

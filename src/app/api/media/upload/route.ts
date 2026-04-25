import { NextRequest, NextResponse } from "next/server";
import { getUser, isValidOrigin } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/mongodb";
import crypto from "crypto";
import { promises as fs, existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

// POST /api/media/upload — Upload a new media file (staff / librarian)
export async function POST(request: NextRequest) {
  try {
    // Security check: only allow requests from this website
    if (!isValidOrigin(request)) {
      return NextResponse.json(
        { success: false, error: "Access denied: External requests not allowed" },
        { status: 403 }
      );
    }
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "STAFF" && user.role !== "LIBRARIAN") {
      return NextResponse.json(
        { success: false, error: "Only staff or librarians can upload media" },
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

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { success: false, error: "Only image and video files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 1024 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be under 1GB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const uniqueId = crypto.randomUUID();
    const extension = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const filename = `${uniqueId}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ────────────────────────────────────────────────────────────────
    //  STORAGE ROUTING
    //  - On Vercel:         STORAGE_SERVER_URL is set → forward to college server
    //  - On college server: STORAGE_SERVER_URL is NOT set → save to local disk
    // ────────────────────────────────────────────────────────────────
    const storageServerUrl = process.env.STORAGE_SERVER_URL;
    const storageSecret = process.env.STORAGE_SECRET;
    const preferLocalStorage = process.env.PREFER_LOCAL_STORAGE === "true";
    let fileUrl: string;

    if (!preferLocalStorage && storageServerUrl && storageSecret) {
      // ── VERCEL MODE ── forward file to the college storage server ──
      const forwardForm = new FormData();
      forwardForm.append("filename", filename); // pre-determined filename
      forwardForm.append(
        "file",
        new Blob([buffer], { type: file.type }),
        filename
      );

      const response = await fetch(`${storageServerUrl}/api/storage/accept`, {
        method: "POST",
        headers: { "X-Storage-Secret": storageSecret },
        body: forwardForm,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`College storage server rejected the file: ${errText}`);
      }

      // File lives on the college server — stream URL points there
      fileUrl = `${storageServerUrl}/api/media/stream?filename=${filename}`;
    } else {
      // ── COLLEGE SERVER MODE ── save directly to private local storage ──
      const uploadsDir = path.join(process.cwd(), "storage", "uploads");
      if (!existsSync(uploadsDir)) {
        await fs.mkdir(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, buffer);

      // Use relative URL to avoid breaking on different base URLs or ngrok tunnels
      // When stored locally, the browser can fetch via relative path
      fileUrl = `/api/media/stream?filename=${filename}`;
    }

    // Save metadata + file URL to MongoDB
    const db = await getDb();

    const newMediaDoc = {
      title,
      description: description || null,
      type: isVideo ? "VIDEO" : "PHOTO",
      url: fileUrl,
      thumbnailUrl: null,
      publicId: filename,
      status: user.role === "LIBRARIAN" ? "APPROVED" : "PENDING",
      eventName: eventName || null,
      eventDate: eventDate || null,
      fileSize: file.size,
      duration: null,
      originalFilename: file.name,
      mimeType: file.type,
      userId: user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await db.collection("media").insertOne(newMediaDoc);

    const uploader = await db
      .collection("users")
      .findOne({ _id: new ObjectId(user.userId) });

    const media = {
      ...newMediaDoc,
      id: insertResult.insertedId.toString(),
      _id: undefined,
      uploadedBy: uploader
        ? { id: uploader._id.toString(), name: uploader.name, email: uploader.email }
        : null,
    };

    return NextResponse.json({
      success: true,
      data: media,
      message:
        user.role === "LIBRARIAN"
          ? "Media uploaded and approved successfully."
          : "Media uploaded successfully. Waiting for librarian approval.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload media",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/mongodb";
import crypto from "crypto";
import { promises as fs, existsSync } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
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

    // If directFilename is provided, it means the browser already uploaded 
    // the heavy file directly to the college server. We just need to save metadata.
    const directFilename = formData.get("directFilename") as string | null;

    if (!file && !directFilename) {
      return NextResponse.json(
        { success: false, error: "File and title are required" },
        { status: 400 }
      );
    }

    if (file) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isVideo && !isImage) {
        return NextResponse.json(
          { success: false, error: "Only image and video files are allowed" },
          { status: 400 }
        );
      }

      if (file.size > 1024 * 1024 * 1024) { // 1GB limit check is still good here
        return NextResponse.json(
          { success: false, error: "File size must be under 1GB" },
          { status: 400 }
        );
      }
    }

    // Generate unique filename if we are handling the file here
    let filename = "";
    let fileUrl = "";
    let finalVideoType = false;
    let finalFileSize = 0;
    let finalOriginalName = "direct-upload";
    let finalMimeType = "application/octet-stream";

    // ────────────────────────────────────────────────────────────────
    //  STORAGE ROUTING
    // ────────────────────────────────────────────────────────────────
    const storageServerUrl = process.env.STORAGE_SERVER_URL;

    if (directFilename) {
      // ── DIRECT UPLOAD HANDLING ── 
      // The browser already sent the file directly to the college server.
      // Store the absolute URL so the browser can fetch it directly (no proxy).
      filename = directFilename;
      // Direct URL to college server — ngrok-skip-browser-warning bypasses the ngrok interstitial page
      const base = storageServerUrl || "";
      fileUrl = `${base}/api/media/stream?filename=${filename}&ngrok-skip-browser-warning=1`;
      finalVideoType = filename.endsWith(".mp4") || filename.endsWith(".webm") || filename.endsWith(".mov");
      
    } else if (file) {
      // ── STANDARD HANDLING ──
      const isVideo = file.type.startsWith("video/");
      finalVideoType = isVideo;
      finalFileSize = file.size;
      finalOriginalName = file.name;
      finalMimeType = file.type;

      const uniqueId = crypto.randomUUID();
      const extension = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      filename = `${uniqueId}.${extension}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const storageSecret = process.env.STORAGE_SECRET;

      if (storageServerUrl && storageSecret) {
        // ── VERCEL MODE ── forward file to the college storage server ──
        const forwardForm = new FormData();
        forwardForm.append("filename", filename);
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
        // Store the FULL college server URL so browser can fetch it directly (no proxy needed)
        fileUrl = `${storageServerUrl}/api/media/stream?filename=${filename}&ngrok-skip-browser-warning=1`;
      } else {
        // ── COLLEGE SERVER MODE ── save directly to private local storage ──
        const uploadsDir = path.join(process.cwd(), "storage", "uploads");
        if (!existsSync(uploadsDir)) {
          await fs.mkdir(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, filename);
        await fs.writeFile(filePath, buffer);
        // On the college server itself, use a relative URL
        fileUrl = `/api/media/stream?filename=${filename}`;
      }
    }

    // Save metadata + file URL to MongoDB
    const db = await getDb();

    const newMediaDoc = {
      title,
      description: description || null,
      type: finalVideoType ? "VIDEO" : "PHOTO",
      url: fileUrl,
      thumbnailUrl: null,
      publicId: filename,
      status: user.role === "LIBRARIAN" ? "APPROVED" : "PENDING",
      eventName: eventName || null,
      eventDate: eventDate || null,
      fileSize: finalFileSize,
      duration: null,
      originalFilename: finalOriginalName,
      mimeType: finalMimeType,
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

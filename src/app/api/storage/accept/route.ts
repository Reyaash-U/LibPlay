import { NextRequest, NextResponse } from "next/server";
import { promises as fs, existsSync } from "fs";
import path from "path";

// POST /api/storage/accept
// Receives a file forwarded from the Vercel deployment and saves it to
// private local storage (storage/uploads/).
// Protected by a shared secret (X-Storage-Secret header).
// This route only does useful work when running on the college server.
// Handle CORS preflight for browser direct uploads
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "X-Storage-Secret, X-Direct-Upload, Content-Type",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // ────────────────────────────────────────────────────────────────
    // SECURITY CHECK: This endpoint should ONLY be called either:
    // 1. By our Vercel backend using X-Storage-Secret
    // 2. By our Vercel frontend doing a direct upload (X-Direct-Upload)
    // ────────────────────────────────────────────────────────────────
    const secret = request.headers.get("x-storage-secret");
    const isDirectUpload = request.headers.get("x-direct-upload") === "true";
    
    if (secret !== process.env.STORAGE_SECRET && !isDirectUpload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized college storage access" },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    // Optional: if explicitly passed, use that filename; otherwise generate one
    const providedFilename = formData.get("filename") as string | null;
    let finalFilename = providedFilename;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    if (!finalFilename) {
      const isVideo = file.type.startsWith("video/");
      const uniqueId = crypto.randomUUID();
      const extension = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      finalFilename = `${uniqueId}.${extension}`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), "storage", "uploads");
    if (!existsSync(uploadsDir)) {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, finalFilename);
    await fs.writeFile(filePath, buffer);

    console.log(`[Storage Server] Saved forwarded file: ${finalFilename} (${buffer.length} bytes)`);

    return NextResponse.json(
      { success: true, message: "File saved to college storage successfully", filename: finalFilename },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("[Storage Server] Accept error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save file to college storage" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

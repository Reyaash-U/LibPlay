import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(new Uint8Array(value));
      }
    },
  });
}

// Proxy route: serves media from private storage/uploads/ directory.
// Files are NOT accessible directly from the web — they only come through here.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return new NextResponse("Filename is required", { status: 400 });
    }

    // Security: strip any path traversal attempts (e.g. ../../etc/passwd)
    const safeFilename = path.basename(filename);

    // Serve from private storage/uploads/ — NOT the public folder
    const filePath = path.join(process.cwd(), "storage", "uploads", safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Detect MIME type by file extension
    const ext = safeFilename.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      mov: "video/quicktime",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const range = request.headers.get("range");

    if (range) {
      // Partial content — allows seeking in videos
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        return new NextResponse("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const stream = iteratorToStream(file[Symbol.asyncIterator]());

      return new NextResponse(stream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
        },
      });
    } else {
      // Full file
      const file = fs.createReadStream(filePath);
      const stream = iteratorToStream(file[Symbol.asyncIterator]());

      return new NextResponse(stream, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
        },
      });
    }
  } catch (error) {
    console.error("Streaming error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

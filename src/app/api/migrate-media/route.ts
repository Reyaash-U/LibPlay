import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

// GET /api/migrate-media
// Moves existing files from public/uploads/ → storage/uploads/
// and updates their URLs in MongoDB to the new proxy format.
// Run this ONCE to migrate old uploads. Only accessible by LIBRARIAN / ADMIN.
export async function GET() {
  try {
    const user = await getUser();
    if (!user || (user.role !== "LIBRARIAN" && user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const db = await getDb();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

    // Find all media records that still use the old relative /uploads/ URL
    const oldRecords = await db
      .collection("media")
      .find({ url: { $regex: /^\/uploads\// } })
      .toArray();

    if (oldRecords.length === 0) {
      return NextResponse.json({
        success: true,
        migrated: 0,
        message: "No old records to migrate. Everything is already up to date!",
      });
    }

    const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
    const privateUploadsDir = path.join(process.cwd(), "storage", "uploads");

    // Ensure private storage dir exists
    if (!fs.existsSync(privateUploadsDir)) {
      fs.mkdirSync(privateUploadsDir, { recursive: true });
    }

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const record of oldRecords) {
      try {
        const filename = record.publicId as string;
        if (!filename) { skipped++; continue; }

        const safeFilename = path.basename(filename);
        const oldPath = path.join(publicUploadsDir, safeFilename);
        const newPath = path.join(privateUploadsDir, safeFilename);

        // Move the file if it exists in public/uploads/
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        }
        // (If the file doesn't exist on disk, we still update the URL in DB)

        // Build the new proxy URL
        const newUrl = `${baseUrl}/api/media/stream?filename=${safeFilename}`;

        // Update MongoDB record
        await db.collection("media").updateOne(
          { _id: record._id },
          { $set: { url: newUrl, updatedAt: new Date() } }
        );

        migrated++;
      } catch (err) {
        errors.push(`${record._id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      migrated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Migration complete. ${migrated} record(s) migrated, ${skipped} skipped.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

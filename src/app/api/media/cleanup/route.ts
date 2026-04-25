import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// GET /api/media/cleanup
// Removes all media records whose URL points to an external localhost (broken seed data)
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.collection("media").deleteMany({
      url: { $regex: /^https?:\/\/localhost/ },
    });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      message: `Removed ${result.deletedCount} broken media record(s) with localhost URLs.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

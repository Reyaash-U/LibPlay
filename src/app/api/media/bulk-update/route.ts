import { NextRequest, NextResponse } from "next/server";
import { getDb, ObjectId } from "@/lib/mongodb";
import { getUser } from "@/lib/auth";

// PATCH /api/media/bulk-update - Bulk update media assets
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== "LIBRARIAN" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { ids, updates } = await request.json();

    if (!ids || !Array.isArray(ids) || !updates) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const objectIds = ids.map(id => new ObjectId(id));

    await db.collection("media").updateMany(
      { _id: { $in: objectIds } },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: `${ids.length} media assets updated successfully`,
    });
  } catch (error) {
    console.error("Bulk update media error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform bulk update" },
      { status: 500 }
    );
  }
}

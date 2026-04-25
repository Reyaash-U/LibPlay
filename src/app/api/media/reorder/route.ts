import { NextRequest, NextResponse } from "next/server";
import { getDb, ObjectId } from "@/lib/mongodb";
import { getUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== "LIBRARIAN" && user.role !== "ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { orders } = await request.json(); // Array of { id: string, order: number }

    if (!Array.isArray(orders)) {
      return NextResponse.json(
        { success: false, error: "Invalid orders data" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const mediaCollection = db.collection("media");

    const updatePromises = orders.map((item) =>
      mediaCollection.updateOne(
        { _id: new ObjectId(item.id) },
        { $set: { order: item.order, updatedAt: new Date() } }
      )
    );

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reorder media" },
      { status: 500 }
    );
  }
}

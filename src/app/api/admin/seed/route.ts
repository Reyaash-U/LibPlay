import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

// GET /api/admin/seed — Seeds the database with default users
export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const usersToInsert = [
      { email: "display@library.com", name: "Display Screen", password: hashedPassword, role: "DISPLAY" },
      { email: "librarian@library.com", name: "Head Librarian", password: hashedPassword, role: "LIBRARIAN" },
      { email: "staff@library.com", name: "Library Staff", password: hashedPassword, role: "STAFF" },
    ];

    const db = await getDb();
    await db.collection("users").deleteMany({});
    await db.collection("users").insertMany(usersToInsert);

    return NextResponse.json({ success: true, message: "Database seeded successfully!" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Seed failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

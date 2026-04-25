import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// GET /api/users — Fetch all users except the current librarian
export async function GET() {
  try {
    const currentUser = await getUser();
    if (!currentUser || currentUser.role !== "LIBRARIAN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const users = await db.collection("users")
      .find({ _id: { $ne: new ObjectId(currentUser.userId) } })
      .project({ password: 0 }) // Exclude passwords
      .toArray();

    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, data: { users: formattedUsers } });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/users — Create a new user account
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUser();
    if (!currentUser || currentUser.role !== "LIBRARIAN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { email, name, password, role } = await request.json();

    if (!email || !name || !password || !role) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      email,
      name,
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("users").insertOne(newUser);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: result.insertedId.toString(),
          email,
          name,
          role,
        }
      }
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

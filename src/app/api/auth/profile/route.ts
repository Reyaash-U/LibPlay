import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getUser, signToken } from "@/lib/auth";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// PATCH /api/auth/profile — Update the current librarian's profile (name, and optional password)
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, password } = await request.json();
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updateData.name = name;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const db = await getDb();
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(currentUser.userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Refresh the token if the name changed
    let newToken = null;
    if (name) {
      newToken = await signToken({
        ...currentUser,
        name,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: { name }
    });

    if (newToken) {
      response.cookies.set("token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 8, // 8 hours
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

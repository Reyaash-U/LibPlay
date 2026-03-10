import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

// GET /api/media/pending - Get pending media (librarian only)
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "LIBRARIAN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const { MongoClient, ObjectId } = require("mongodb");
    const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/libplay";
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("libplay");
    const mediaCollection = db.collection("media");

    const [rawMedia, total] = await Promise.all([
      mediaCollection.find({ status: "PENDING" })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      mediaCollection.countDocuments({ status: "PENDING" }),
    ]);

    const userIds = Array.from(new Set(rawMedia.map((m: any) => m.userId)));
    const users = await db.collection("users").find({ _id: { $in: userIds.map((id: any) => new ObjectId(id as string)) } }).toArray();
    const userMap = users.reduce((acc: any, u: any) => {
      acc[u._id.toString()] = { id: u._id.toString(), name: u.name, email: u.email };
      return acc;
    }, {});

    const media = rawMedia.map((m: any) => ({
      ...m,
      id: m._id.toString(),
      _id: undefined,
      uploadedBy: userMap[m.userId] || null
    }));

    await client.close();

    return NextResponse.json({
      success: true,
      data: {
        media,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get pending media error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending media" },
      { status: 500 }
    );
  }
}

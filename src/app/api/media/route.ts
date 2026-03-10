import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/auth";

// GET /api/media - Get approved media (public) or all media for librarian
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // If not authenticated or is staff, only show approved
    if (!user || user.role === "STAFF") {
      where.status = "APPROVED";
    } else if (status) {
      where.status = status;
    }

    // If staff, also allow them to see their own uploads
    if (user?.role === "STAFF") {
      where.OR = [{ status: "APPROVED" }, { userId: user.userId }];
      delete where.status;
    }

    if (type) {
      where.type = type;
    }

    const { MongoClient, ObjectId } = require("mongodb");
    const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/libplay";
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("libplay");
    const mediaCollection = db.collection("media");

    const [rawMedia, total] = await Promise.all([
      mediaCollection.find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      mediaCollection.countDocuments(where),
    ]);

    // Manually map uploder because populate doesn't exist here without aggregations
    // But since it's just basic info we can aggregate or run a separate find
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
    console.error("Get media error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}

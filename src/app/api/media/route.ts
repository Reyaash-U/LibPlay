import { NextRequest, NextResponse } from "next/server";
import { getDb, ObjectId } from "@/lib/mongodb";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/media
// Public:        returns APPROVED media only
// STAFF:         returns approved + own uploads
// DISPLAY:       returns approved media only
// LIBRARIAN/ADMIN: respects ?status filter, defaults to all
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = {};

    if (!user || user.role === "STAFF" || user.role === "DISPLAY") {
      if (user?.role === "STAFF") {
        if (status === "APPROVED") {
          where.status = "APPROVED";
        } else if (status === "PENDING" || status === "REJECTED") {
          where = { status, userId: user.userId };
        } else {
          // Default: approved media + their own uploads
          where = { $or: [{ status: "APPROVED" }, { userId: user.userId }] };
        }
      } else {
        // Public and display users see approved media only
        where.status = "APPROVED";
      }
    } else {
      // Librarian / Admin — filter by status if provided
      if (status) {
        where.status = status;
      }
    }

    if (type) {
      where.type = type;
    }

    const db = await getDb();
    const mediaCollection = db.collection("media");

    const [rawMedia, total] = await Promise.all([
      mediaCollection
        .find(where)
        .sort({ order: 1, createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      mediaCollection.countDocuments(where),
    ]);

    // Fetch all uploaders in a single query
    const userIds = Array.from(new Set(rawMedia.map((m) => m.userId as string)));
    const users = await db
      .collection("users")
      .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
      .toArray();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userMap = users.reduce((acc: Record<string, any>, u) => {
      acc[u._id.toString()] = { id: u._id.toString(), name: u.name, email: u.email };
      return acc;
    }, {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const media = rawMedia.map((m: any) => {
      // Make media URLs relative to fixed broken images on different environments
      let relativeUrl = m.url;
      if (m.url && m.url.includes("/api/media/stream")) {
        const parts = m.url.split("/api/media/stream");
        relativeUrl = "/api/media/stream" + parts[parts.length - 1];
      }

      return {
        ...m,
        id: m._id.toString(),
        _id: undefined,
        url: relativeUrl,
        uploadedBy: userMap[m.userId as string] || null,
      };
    });

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

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

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.media.count({ where }),
    ]);

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

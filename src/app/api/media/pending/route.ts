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

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where: { status: "PENDING" },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.media.count({ where: { status: "PENDING" } }),
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
    console.error("Get pending media error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending media" },
      { status: 500 }
    );
  }
}

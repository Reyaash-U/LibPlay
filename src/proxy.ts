import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest, isValidOrigin, verifyToken } from "@/lib/auth";

// Routes that require authentication
const protectedRoutes = ["/staff", "/librarian"];
const librarianRoutes = ["/librarian"];
// Display page requires login but any role can access it
const displayRoutes = ["/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- NEW SECURITY LOGIC FOR MEDIA ---
  // We skip /api/media/upload in proxy to avoid large body buffering issues
  // Security for that endpoint is handled internally in its route handler.
  if (pathname.startsWith("/api/media") && pathname !== "/api/media/upload") {
    // 1. Check Origin/Referer to restrict to this website only
    if (!isValidOrigin(request)) {
      return NextResponse.json(
        { success: false, error: "Access denied: External requests not allowed" },
        { status: 403 }
      );
    }

    // 2. Special handling for streaming: require authentication
    if (pathname === "/api/media/stream") {
      const token = request.cookies.get("token")?.value;
      if (!token || !(await verifyToken(token))) {
        return NextResponse.json(
          { success: false, error: "Authentication required to stream media" },
          { status: 401 }
        );
      }
    }
    return NextResponse.next();
  }
  // -------------------------------------

  const isDisplayRoute = displayRoutes.some((route) => pathname === route);
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected && !isDisplayRoute) {
    return NextResponse.next();
  }

  const user = await getUserFromRequest(request);

  // Not authenticated
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check librarian access
  const isLibrarianRoute = librarianRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (
    isLibrarianRoute &&
    user.role !== "LIBRARIAN" &&
    user.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/staff", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/", 
    "/staff/:path*", 
    "/librarian/:path*", 
    // Protect all media routes EXCEPT upload
    "/api/media",
    "/api/media/stream",
    "/api/media/stats",
    "/api/media/pending",
    "/api/media/reorder",
    "/api/media/bulk-update",
    "/api/media/migrate",
    "/api/media/cleanup",
  ],
};

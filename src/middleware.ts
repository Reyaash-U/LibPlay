import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

// Routes that require authentication
const protectedRoutes = ["/staff", "/librarian"];
const librarianRoutes = ["/librarian"];
// Display page requires login but any role can access it
const displayRoutes = ["/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/", "/staff/:path*", "/librarian/:path*"],
};

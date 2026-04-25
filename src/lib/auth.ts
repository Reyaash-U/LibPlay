import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-me"
);

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: "DISPLAY" | "STAFF" | "LIBRARIAN" | "ADMIN";
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getUserFromRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Checks if the request comes from the same origin or has a valid referer.
 * This helps restrict access to 'this website only'.
 */
export function isValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // In development, host might be localhost:3000
  // In production, it will be the actual domain.
  // We check if the origin/referer starts with the same protocol and host.
  const checkUrl = (url: string | null) => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.host === host;
    } catch {
      return false;
    }
  };

  // If it's a browser navigation or direct access without origin (like GET), 
  // check the referer. 
  // For cross-origin POST/PUT/DELETE, the browser sends an Origin header.
  if (origin) {
    return checkUrl(origin);
  }

  if (referer) {
    return checkUrl(referer);
  }

  // If no origin and no referer, it might be a direct API call from elsewhere
  return false;
}

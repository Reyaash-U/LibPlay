import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { success: true, data: { user: null } }
    );
  }
  return NextResponse.json({ success: true, data: { user } });
}

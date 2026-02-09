import { NextResponse } from "next/server";

export async function GET() {
  const token = (globalThis as Record<string, unknown>).__chiron_auth_token as string | undefined;
  if (!token) {
    return NextResponse.json({ error: "Auth token not available" }, { status: 500 });
  }
  return NextResponse.json({ token });
}

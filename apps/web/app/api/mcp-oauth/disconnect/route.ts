import { NextRequest, NextResponse } from "next/server";
import { deleteOAuthToken } from "@chiron-os/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { serverName } = body;

  if (!serverName || typeof serverName !== "string") {
    return NextResponse.json({ error: "serverName is required" }, { status: 400 });
  }

  deleteOAuthToken(serverName);
  return NextResponse.json({ ok: true });
}

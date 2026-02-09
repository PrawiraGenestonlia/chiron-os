import { NextRequest, NextResponse } from "next/server";
import { discoverOAuthMetadata } from "@chiron-os/core";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const serverUrl = body.serverUrl;

  if (!serverUrl || typeof serverUrl !== "string") {
    return NextResponse.json({ error: "serverUrl is required" }, { status: 400 });
  }

  try {
    const result = await discoverOAuthMetadata(serverUrl);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Discovery failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAllOAuthTokens } from "@chiron-os/db";

export async function GET() {
  const tokens = getAllOAuthTokens();

  const statuses = tokens.map((t) => {
    const isExpired = t.expiresAt ? new Date(t.expiresAt) < new Date() : false;
    return {
      serverName: t.serverName,
      serverUrl: t.serverUrl,
      expiresAt: t.expiresAt,
      isExpired,
      isConnected: !isExpired,
      hasRefreshToken: !!t.refreshToken,
    };
  });

  return NextResponse.json({ tokens: statuses });
}

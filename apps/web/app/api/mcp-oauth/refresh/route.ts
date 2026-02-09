import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@chiron-os/core";
import { getOAuthToken, upsertOAuthToken } from "@chiron-os/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { serverName } = body;

  if (!serverName || typeof serverName !== "string") {
    return NextResponse.json({ error: "serverName is required" }, { status: 400 });
  }

  const stored = getOAuthToken(serverName);
  if (!stored) {
    return NextResponse.json({ error: "No OAuth token found for this server" }, { status: 404 });
  }

  if (!stored.refreshToken) {
    return NextResponse.json({ error: "No refresh token available" }, { status: 400 });
  }

  if (!stored.tokenEndpoint || !stored.clientId) {
    return NextResponse.json({ error: "Missing OAuth endpoint or client info" }, { status: 400 });
  }

  try {
    const tokens = await refreshAccessToken({
      tokenEndpoint: stored.tokenEndpoint,
      refreshToken: stored.refreshToken,
      clientId: stored.clientId,
      clientSecret: stored.clientSecret ?? undefined,
    });

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    upsertOAuthToken({
      serverName: stored.serverName,
      serverUrl: stored.serverUrl,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? stored.refreshToken,
      tokenType: tokens.token_type ?? stored.tokenType,
      expiresAt,
      scope: tokens.scope ?? stored.scope,
      clientId: stored.clientId,
      clientSecret: stored.clientSecret,
      authorizationEndpoint: stored.authorizationEndpoint,
      tokenEndpoint: stored.tokenEndpoint,
      registrationEndpoint: stored.registrationEndpoint,
    });

    return NextResponse.json({ ok: true, expiresAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Token refresh failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@chiron-os/core";
import type { OAuthStateStore } from "@chiron-os/core";
import { upsertOAuthToken } from "@chiron-os/db";
import { DEFAULT_PORT } from "@chiron-os/shared";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    const desc = searchParams.get("error_description") ?? error;
    return new NextResponse(callbackHtml(false, desc), {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code || !state) {
    return new NextResponse(callbackHtml(false, "Missing code or state"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const stateStore = (globalThis as Record<string, unknown>).__chiron_oauth_state as
    | OAuthStateStore
    | undefined;
  if (!stateStore) {
    return new NextResponse(callbackHtml(false, "OAuth state store not initialized"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const entry = stateStore.consume(state);
  if (!entry) {
    return new NextResponse(callbackHtml(false, "Invalid or expired state"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const port = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
    const redirectUri = `http://localhost:${port}/oauth/callback`;

    const tokens = await exchangeCodeForTokens({
      tokenEndpoint: entry.metadata.tokenEndpoint,
      code,
      redirectUri,
      codeVerifier: entry.codeVerifier,
      clientId: entry.clientId,
      clientSecret: entry.clientSecret,
    });

    // Compute expiry timestamp
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store in DB
    upsertOAuthToken({
      serverName: entry.serverName,
      serverUrl: entry.serverUrl,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenType: tokens.token_type ?? "Bearer",
      expiresAt,
      scope: tokens.scope ?? null,
      clientId: entry.clientId,
      clientSecret: entry.clientSecret ?? null,
      authorizationEndpoint: entry.metadata.authorizationEndpoint,
      tokenEndpoint: entry.metadata.tokenEndpoint,
      registrationEndpoint: entry.metadata.registrationEndpoint ?? null,
    });

    return new NextResponse(callbackHtml(true, entry.serverName), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token exchange failed";
    return new NextResponse(callbackHtml(false, msg), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

function callbackHtml(success: boolean, detail: string): string {
  const title = success ? "Connected" : "Connection Failed";
  const message = success
    ? `Successfully connected to <strong>${escapeHtml(detail)}</strong>.`
    : `Error: ${escapeHtml(detail)}`;
  const color = success ? "#22c55e" : "#ef4444";

  return `<!DOCTYPE html>
<html>
<head><title>${title} - Chiron OS</title></head>
<body style="font-family:system-ui;background:#0a0a0b;color:#e5e7eb;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center;max-width:400px">
    <div style="font-size:48px;margin-bottom:16px">${success ? "&#10003;" : "&#10007;"}</div>
    <h2 style="color:${color};margin:0 0 8px">${title}</h2>
    <p style="margin:0 0 24px;font-size:14px">${message}</p>
    <p style="font-size:12px;color:#6b7280">This window will close automatically.</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'mcp-oauth-complete',
        success: ${success},
        serverName: ${JSON.stringify(detail)}
      }, '*');
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

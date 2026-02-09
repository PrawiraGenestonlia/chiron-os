import { NextRequest, NextResponse } from "next/server";
import {
  discoverOAuthMetadata,
  registerClient,
  generatePKCE,
  buildAuthorizationUrl,
} from "@chiron-os/core";
import type { OAuthStateStore } from "@chiron-os/core";
import { DEFAULT_PORT } from "@chiron-os/shared";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { serverName, serverUrl } = body;

  if (!serverName || typeof serverName !== "string") {
    return NextResponse.json({ error: "serverName is required" }, { status: 400 });
  }
  if (!serverUrl || typeof serverUrl !== "string") {
    return NextResponse.json({ error: "serverUrl is required" }, { status: 400 });
  }

  const stateStore = (globalThis as Record<string, unknown>).__chiron_oauth_state as
    | OAuthStateStore
    | undefined;
  if (!stateStore) {
    return NextResponse.json({ error: "OAuth state store not initialized" }, { status: 500 });
  }

  try {
    // Step 1: Discover OAuth metadata
    const discovery = await discoverOAuthMetadata(serverUrl);
    if (!discovery.needsAuth || !discovery.metadata) {
      return NextResponse.json(
        { error: "Server does not require OAuth authentication" },
        { status: 400 }
      );
    }

    const { metadata } = discovery;
    const port = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
    const redirectUri = `http://localhost:${port}/oauth/callback`;

    // Step 2: Dynamic client registration (if supported)
    let clientId: string;
    let clientSecret: string | undefined;

    if (metadata.registrationEndpoint) {
      const reg = await registerClient(metadata.registrationEndpoint, redirectUri);
      clientId = reg.clientId;
      clientSecret = reg.clientSecret;
    } else {
      return NextResponse.json(
        { error: "Server does not support dynamic client registration. Use mcp-remote as a fallback." },
        { status: 400 }
      );
    }

    // Step 3: Generate PKCE
    const pkce = generatePKCE();

    // Step 4: Store state
    const state = stateStore.create({
      serverName,
      serverUrl,
      codeVerifier: pkce.codeVerifier,
      clientId,
      clientSecret,
      metadata,
    });

    // Step 5: Build authorization URL
    const authorizationUrl = buildAuthorizationUrl({
      authorizationEndpoint: metadata.authorizationEndpoint,
      clientId,
      redirectUri,
      codeChallenge: pkce.codeChallenge,
      state,
      scope: metadata.scopesSupported?.join(" "),
    });

    return NextResponse.json({ authorizationUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OAuth initiation failed" },
      { status: 500 }
    );
  }
}

import { createHash, randomBytes } from "node:crypto";

// ── Types ────────────────────────────────────────────────

export interface OAuthMetadata {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
  scopesSupported?: string[];
  responseTypesSupported?: string[];
  grantTypesSupported?: string[];
  codeChallengeMethodsSupported?: string[];
}

export interface OAuthDiscoveryResult {
  needsAuth: boolean;
  metadata?: OAuthMetadata;
  supportsRegistration: boolean;
}

export interface ClientRegistrationResult {
  clientId: string;
  clientSecret?: string;
}

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

// ── Discovery ────────────────────────────────────────────

/**
 * Probe an MCP server to discover OAuth requirements.
 * Per the MCP Authorization spec:
 * 1. Send a request to the server
 * 2. On 401, extract resource_metadata URL from WWW-Authenticate header
 * 3. Fetch Protected Resource Metadata
 * 4. Fetch Authorization Server Metadata
 */
export async function discoverOAuthMetadata(
  serverUrl: string
): Promise<OAuthDiscoveryResult> {
  // Step 1: Probe the server
  const probeRes = await fetch(serverUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
  });

  if (probeRes.ok) {
    return { needsAuth: false, supportsRegistration: false };
  }

  if (probeRes.status !== 401) {
    return { needsAuth: false, supportsRegistration: false };
  }

  // Step 2: Extract resource_metadata from WWW-Authenticate
  const wwwAuth = probeRes.headers.get("www-authenticate") ?? "";
  const resourceMetadataMatch = wwwAuth.match(/resource_metadata="([^"]+)"/);

  let asBaseUrl: string;

  if (resourceMetadataMatch) {
    // Step 3: Fetch Protected Resource Metadata
    const rmUrl = resourceMetadataMatch[1];
    const rmRes = await fetch(rmUrl);
    if (!rmRes.ok) {
      return { needsAuth: true, supportsRegistration: false };
    }
    const rmData = (await rmRes.json()) as {
      authorization_servers?: string[];
    };
    const authServers = rmData.authorization_servers;
    if (!authServers || authServers.length === 0) {
      return { needsAuth: true, supportsRegistration: false };
    }
    asBaseUrl = authServers[0];
  } else {
    // Fallback: try the server's origin as the AS
    const parsed = new URL(serverUrl);
    asBaseUrl = parsed.origin;
  }

  // Step 4: Fetch Authorization Server Metadata
  const asMetadataUrl = `${asBaseUrl.replace(/\/$/, "")}/.well-known/oauth-authorization-server`;
  const asRes = await fetch(asMetadataUrl);
  if (!asRes.ok) {
    return { needsAuth: true, supportsRegistration: false };
  }

  const asData = (await asRes.json()) as {
    authorization_endpoint?: string;
    token_endpoint?: string;
    registration_endpoint?: string;
    scopes_supported?: string[];
    response_types_supported?: string[];
    grant_types_supported?: string[];
    code_challenge_methods_supported?: string[];
  };

  if (!asData.authorization_endpoint || !asData.token_endpoint) {
    return { needsAuth: true, supportsRegistration: false };
  }

  const metadata: OAuthMetadata = {
    authorizationEndpoint: asData.authorization_endpoint,
    tokenEndpoint: asData.token_endpoint,
    registrationEndpoint: asData.registration_endpoint,
    scopesSupported: asData.scopes_supported,
    responseTypesSupported: asData.response_types_supported,
    grantTypesSupported: asData.grant_types_supported,
    codeChallengeMethodsSupported: asData.code_challenge_methods_supported,
  };

  return {
    needsAuth: true,
    metadata,
    supportsRegistration: !!asData.registration_endpoint,
  };
}

// ── Dynamic Client Registration (RFC 7591) ───────────────

/**
 * Register Chiron OS as an OAuth client with the authorization server.
 */
export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string
): Promise<ClientRegistrationResult> {
  const res = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Chiron OS",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Client registration failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    client_id: string;
    client_secret?: string;
  };

  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
  };
}

// ── PKCE ─────────────────────────────────────────────────

/**
 * Generate PKCE code_verifier and code_challenge (S256).
 */
export function generatePKCE(): PKCEPair {
  // 43-128 chars, URL-safe
  const codeVerifier = randomBytes(32)
    .toString("base64url")
    .slice(0, 64);

  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

// ── Authorization URL ────────────────────────────────────

export interface AuthorizationUrlParams {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scope?: string;
}

/**
 * Build the authorization URL for the OAuth popup.
 */
export function buildAuthorizationUrl(params: AuthorizationUrlParams): string {
  const url = new URL(params.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  if (params.scope) {
    url.searchParams.set("scope", params.scope);
  }
  return url.toString();
}

// ── Token Exchange ───────────────────────────────────────

export interface TokenExchangeParams {
  tokenEndpoint: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
  clientSecret?: string;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  params: TokenExchangeParams
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
    client_id: params.clientId,
  });

  if (params.clientSecret) {
    body.set("client_secret", params.clientSecret);
  }

  const res = await fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return (await res.json()) as TokenResponse;
}

// ── Token Refresh ────────────────────────────────────────

export interface TokenRefreshParams {
  tokenEndpoint: string;
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(
  params: TokenRefreshParams
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });

  if (params.clientSecret) {
    body.set("client_secret", params.clientSecret);
  }

  const res = await fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  return (await res.json()) as TokenResponse;
}

import { eq, inArray } from "drizzle-orm";
import { db } from "../client.js";
import { oauthTokens } from "../schema/index.js";
import { generateId, nowISO } from "@chiron-os/shared";

export interface OAuthTokenUpsert {
  serverName: string;
  serverUrl: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string;
  expiresAt?: string | null;
  scope?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  authorizationEndpoint?: string | null;
  tokenEndpoint?: string | null;
  registrationEndpoint?: string | null;
}

export function getOAuthToken(serverName: string) {
  return db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.serverName, serverName))
    .get();
}

export function getAllOAuthTokens() {
  return db.select().from(oauthTokens).all();
}

export function getOAuthTokensForServers(names: string[]) {
  if (names.length === 0) return [];
  return db
    .select()
    .from(oauthTokens)
    .where(inArray(oauthTokens.serverName, names))
    .all();
}

export function upsertOAuthToken(data: OAuthTokenUpsert) {
  const now = nowISO();
  const existing = getOAuthToken(data.serverName);

  if (existing) {
    db.update(oauthTokens)
      .set({
        serverUrl: data.serverUrl,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? existing.refreshToken,
        tokenType: data.tokenType ?? existing.tokenType,
        expiresAt: data.expiresAt ?? existing.expiresAt,
        scope: data.scope ?? existing.scope,
        clientId: data.clientId ?? existing.clientId,
        clientSecret: data.clientSecret ?? existing.clientSecret,
        authorizationEndpoint: data.authorizationEndpoint ?? existing.authorizationEndpoint,
        tokenEndpoint: data.tokenEndpoint ?? existing.tokenEndpoint,
        registrationEndpoint: data.registrationEndpoint ?? existing.registrationEndpoint,
        updatedAt: now,
      })
      .where(eq(oauthTokens.id, existing.id))
      .run();
    return getOAuthToken(data.serverName)!;
  }

  const id = generateId();
  db.insert(oauthTokens)
    .values({
      id,
      serverName: data.serverName,
      serverUrl: data.serverUrl,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      tokenType: data.tokenType ?? "Bearer",
      expiresAt: data.expiresAt ?? null,
      scope: data.scope ?? null,
      clientId: data.clientId ?? null,
      clientSecret: data.clientSecret ?? null,
      authorizationEndpoint: data.authorizationEndpoint ?? null,
      tokenEndpoint: data.tokenEndpoint ?? null,
      registrationEndpoint: data.registrationEndpoint ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return getOAuthToken(data.serverName)!;
}

export function deleteOAuthToken(serverName: string) {
  db.delete(oauthTokens)
    .where(eq(oauthTokens.serverName, serverName))
    .run();
}

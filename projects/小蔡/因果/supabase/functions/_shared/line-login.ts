import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, jwtVerify } from "npm:jose@5.9.6";

export const DB_SCHEMA = (Deno.env.get("CAUSELAW_DB_SCHEMA") || "causelaw_yinguo_v1").trim() || "causelaw_yinguo_v1";
const encoder = new TextEncoder();

function getRequiredEnv(name: string): string {
  const value = (Deno.env.get(name) || "").trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string): string {
  return (Deno.env.get(name) || "").trim();
}

function getJwtKey(secret: string): Uint8Array {
  return encoder.encode(secret);
}

function getSupabaseUrl(): string {
  return getRequiredEnv("SUPABASE_URL");
}

function getServiceRoleKey(): string {
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getLineChannelId(): string {
  return getRequiredEnv("CAUSELAW_LINE_CHANNEL_ID");
}

export function getLineChannelSecret(): string {
  return getRequiredEnv("CAUSELAW_LINE_CHANNEL_SECRET");
}

export function getLineLoginScope(): string {
  return getOptionalEnv("CAUSELAW_LINE_LOGIN_SCOPE") || "profile openid";
}

export function getLineCallbackUrl(): string {
  const explicit = getOptionalEnv("CAUSELAW_LINE_CALLBACK_URL");
  if (explicit) return explicit;
  return new URL("/functions/v1/line-login-callback", getSupabaseUrl()).toString();
}

export function getSiteUrl(): string {
  return getOptionalEnv("CAUSELAW_SITE_URL") || "http://127.0.0.1:8000/index.html";
}

function getAllowedReturnOrigins(request: Request): string[] {
  const configured = (getOptionalEnv("CAUSELAW_ALLOWED_RETURN_ORIGINS") || getOptionalEnv("CAUSELAW_SITE_URL"))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      configured.push(new URL(referer).origin);
    } catch (_err) {
      // ignore malformed referer
    }
  }

  return Array.from(new Set(configured));
}

export function sanitizeReturnTo(input: string | null, request: Request): string {
  const fallback = getSiteUrl();
  if (!input) return fallback;

  try {
    const target = new URL(input);
    const allowedOrigins = getAllowedReturnOrigins(request);
    if (!allowedOrigins.length) return fallback;
    if (allowedOrigins.includes(target.origin)) {
      target.hash = "";
      return target.toString();
    }
  } catch (_err) {
    // ignore invalid return_to
  }

  return fallback;
}

export async function signState(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getJwtKey(getLineChannelSecret()));
}

export async function verifyState(token: string): Promise<Record<string, unknown>> {
  const result = await jwtVerify(token, getJwtKey(getLineChannelSecret()));
  return result.payload as Record<string, unknown>;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildPseudoEmail(lineUserId: string): Promise<string> {
  const digest = await sha256Hex(lineUserId || crypto.randomUUID());
  return `line+${digest.slice(0, 24)}@causelaw.local`;
}

export function trimDisplayName(name: string | null | undefined): string {
  const cleaned = (name || "").trim();
  if (!cleaned) return "LINE會員";
  return cleaned.slice(0, 24);
}

export function buildRedirectUrl(returnTo: string, params: Record<string, string>): string {
  const target = new URL(returnTo);
  const hash = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    hash.set(key, value);
  });
  target.hash = hash.toString();
  return target.toString();
}

export async function exchangeLineCode(code: string): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getLineCallbackUrl(),
    client_id: getLineChannelId(),
    client_secret: getLineChannelSecret(),
  });

  const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(String((data as Record<string, unknown>).error_description || (data as Record<string, unknown>).error || "LINE token exchange failed"));
  }
  return data as Record<string, unknown>;
}

export async function verifyLineIdToken(idToken: string, nonce: string): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: getLineChannelId(),
  });

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(String((data as Record<string, unknown>).error_description || (data as Record<string, unknown>).error || "LINE id_token verify failed"));
  }
  if (nonce && String((data as Record<string, unknown>).nonce || "") !== nonce) {
    throw new Error("LINE nonce mismatch");
  }
  return data as Record<string, unknown>;
}

export function getServiceClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    db: { schema: DB_SCHEMA },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getLineTokenTtlSeconds(): number {
  const value = Number(getOptionalEnv("CAUSELAW_LINE_LOGIN_TTL_SECONDS") || 60 * 60 * 24 * 7);
  if (!Number.isFinite(value) || value < 300) return 60 * 60 * 24 * 7;
  return Math.floor(value);
}

export async function issueAppJwt(input: {
  memberId: string;
  email?: string | null;
  displayName?: string | null;
  picture?: string | null;
}) {
  const secret = getRequiredEnv("CAUSELAW_EXTERNAL_JWT_SECRET");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = getLineTokenTtlSeconds();
  const expSeconds = nowSeconds + ttlSeconds;
  const token = await new SignJWT({
    role: "authenticated",
    email: input.email || undefined,
    app_metadata: {
      provider: "line",
      providers: ["line"],
    },
    user_metadata: {
      display_name: trimDisplayName(input.displayName),
      avatar_url: input.picture || undefined,
      provider: "line",
    },
    aal: "aal1",
    amr: ["line"],
    session_id: crypto.randomUUID(),
    is_anonymous: false,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(getOptionalEnv("CAUSELAW_EXTERNAL_JWT_ISSUER") || "causelaw-line-bridge")
    .setSubject(input.memberId)
    .setAudience("authenticated")
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expSeconds)
    .sign(getJwtKey(secret));

  return {
    token,
    expiresAtMs: expSeconds * 1000,
  };
}

export function toSafeMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || "登入失敗");
  if (raw.includes("Missing required env")) return "LINE 登入尚未完成部署設定，請稍後再試。";
  if (raw.includes("nonce")) return "LINE 登入驗證失敗，請重新嘗試。";
  return raw || "登入失敗，請稍後再試。";
}

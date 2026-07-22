import { headers } from "next/headers";
import { getBindings } from "../db/runtime";

export type AppSession = {
  role: "admin" | "user";
  sub: string;
  name: string;
  exp: number;
};

const SESSION_COOKIE = "vhb_session";
const OAUTH_COOKIE = "vhb_oauth_state";
const encoder = new TextEncoder();

function base64UrlEncode(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return new Uint8Array([...binary].map((character) => character.charCodeAt(0)));
}

function authSecret() {
  const bindings = getBindings();
  if (!bindings.AUTH_SECRET || bindings.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters");
  }
  return bindings.AUTH_SECRET;
}

async function signature(payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(authSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

export async function signValue(value: unknown) {
  const payload = base64UrlEncode(JSON.stringify(value));
  return `${payload}.${base64UrlEncode(await signature(payload))}`;
}

export async function verifyValue<T>(token: string | null | undefined): Promise<T | null> {
  if (!token) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  const expected = await signature(payload);
  const supplied = base64UrlDecode(suppliedSignature);
  if (expected.length !== supplied.length) return null;
  let mismatch = 0;
  expected.forEach((byte, index) => { mismatch |= byte ^ supplied[index]; });
  if (mismatch !== 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as T;
  } catch {
    return null;
  }
}

export function readCookie(cookieHeader: string | null, name: string) {
  const match = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function sessionFromRequest(request: Request) {
  return validateSession(await verifyValue<AppSession>(readCookie(request.headers.get("cookie"), SESSION_COOKIE)));
}

export async function sessionFromHeaders() {
  const requestHeaders = await headers();
  return validateSession(await verifyValue<AppSession>(readCookie(requestHeaders.get("cookie"), SESSION_COOKIE)));
}

function validateSession(session: AppSession | null) {
  return session && session.exp > Date.now() ? session : null;
}

export async function sessionCookie(session: Omit<AppSession, "exp">) {
  const token = await signValue({ ...session, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function oauthStateCookie(state: string, returnTo: string) {
  const token = await signValue({ state, returnTo, exp: Date.now() + 10 * 60 * 1000 });
  return `${OAUTH_COOKIE}=${encodeURIComponent(token)}; Path=/api/auth/wechat; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export async function oauthStateFromRequest(request: Request) {
  return verifyValue<{ state: string; returnTo: string; exp: number }>(readCookie(request.headers.get("cookie"), OAUTH_COOKIE));
}

export function clearOauthStateCookie() {
  return `${OAUTH_COOKIE}=; Path=/api/auth/wechat; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function safeReturnTo(value: string | null | undefined, fallback = "/") {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

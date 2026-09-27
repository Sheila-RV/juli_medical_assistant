import { createHmac, timingSafeEqual } from "node:crypto";
import { findUserById, toPublicUser, type PublicUser } from "./users";

/**
 * Sesión sin estado: una cookie HttpOnly con `payload.firma` (HMAC-SHA256).
 * El servidor no guarda nada; basta con AUTH_SECRET para verificarla.
 * Sin "server-only" a propósito: el proxy también la importa.
 */
export const SESSION_COOKIE = "juli_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60; // una jornada

const DEV_SECRET = "juli-demo-secret-cambia-esto-en-produccion";

function secret() {
  return process.env.AUTH_SECRET || DEV_SECRET;
}

function sign(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

interface SessionPayload {
  uid: string;
  exp: number; // epoch en segundos
}

export function createSessionToken(uid: string, ttlSeconds = SESSION_TTL_SECONDS, now = Date.now()): string {
  const payload: SessionPayload = { uid, exp: Math.floor(now / 1000) + ttlSeconds };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string | undefined | null, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Token → usuario público, o null si la sesión no es válida o el usuario ya no existe. */
export function userFromToken(token: string | undefined | null): PublicUser | null {
  const payload = verifySessionToken(token);
  const user = payload && findUserById(payload.uid);
  return user ? toPublicUser(user) : null;
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function userFromRequest(request: Request): PublicUser | null {
  return userFromToken(readCookie(request.headers.get("cookie"), SESSION_COOKIE));
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

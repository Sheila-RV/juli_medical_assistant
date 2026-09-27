import "server-only";
import { userFromRequest } from "./auth/session";
import type { PublicUser } from "./auth/users";
import { config } from "./config";
import { checkRateLimit, clientKey } from "./rate-limit";

export function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

/** Devuelve una respuesta 429 si se excede el límite, o null si puede continuar. */
export function enforceRateLimit(request: Request, scope: string): Response | null {
  const { ok, retryAfter } = checkRateLimit(`${scope}:${clientKey(request)}`, config.rateLimitPerMinute);
  if (ok) return null;
  return jsonError("Demasiadas peticiones. Espera un momento.", 429, { "Retry-After": String(retryAfter) });
}

export function accessCodeFrom(request: Request): string | null {
  return request.headers.get("x-access-code");
}

/** Exige una sesión válida: devuelve el usuario o una respuesta 401 lista para retornar. */
export function requireUser(request: Request): PublicUser | Response {
  return userFromRequest(request) ?? jsonError("Tu sesión expiró. Vuelve a iniciar sesión.", 401);
}

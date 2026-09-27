import "server-only";

/**
 * Límite de peticiones en memoria (ventana deslizante por IP).
 *
 * Es "best effort": en serverless cada instancia tiene su propio mapa. Basta
 * para frenar abusos en un MVP; en producción usar Redis/Upstash (ver docs).
 */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;

export function checkRateLimit(key: string, limit: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // evita crecimiento sin límite
  return { ok: true, retryAfter: 0 };
}

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

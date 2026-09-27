import "server-only";
import type { RunMode } from "./templates/types";

/**
 * Toda la configuración viene de variables de entorno (ver .env.example).
 * Sin claves la app funciona en modo demo, lo que permite publicar el
 * portafolio sin exponer costos de API.
 */
const openaiKey = process.env.OPENAI_API_KEY ?? "";

export const config = {
  openai: {
    apiKey: openaiKey,
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    reasoningEffort: (process.env.OPENAI_REASONING_EFFORT || "low") as "minimal" | "low" | "medium" | "high",
  },
  stt: {
    // Por defecto reutiliza la clave de OpenAI; STT_API_KEY permite usar otro proveedor (p. ej. Groq).
    apiKey: process.env.STT_API_KEY || openaiKey,
    // Cualquier endpoint compatible con /audio/transcriptions.
    baseUrl: (process.env.STT_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.STT_MODEL || "whisper-1",
    language: process.env.STT_LANGUAGE || "es",
  },
  /** Si se define, las llamadas reales exigen la cabecera x-access-code. */
  accessCode: process.env.ACCESS_CODE ?? "",
  forceDemo: process.env.DEMO_MODE === "true",
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 10),
} as const;

export type Capability = "structure" | "transcribe";

function hasKey(capability: Capability): boolean {
  return capability === "structure" ? Boolean(config.openai.apiKey) : Boolean(config.stt.apiKey);
}

/** Decide si una petición concreta se ejecuta contra las APIs reales o en demo. */
export function resolveMode(capability: Capability, providedAccessCode: string | null): RunMode {
  if (config.forceDemo || !hasKey(capability)) return "demo";
  if (config.accessCode && providedAccessCode !== config.accessCode) return "demo";
  return "live";
}

/** Información pública (sin secretos) para que la UI sepa qué esperar. */
export function publicStatus() {
  return {
    structure: config.forceDemo || !hasKey("structure") ? "demo" : "live",
    transcribe: config.forceDemo || !hasKey("transcribe") ? "demo" : "live",
    accessCodeRequired: Boolean(config.accessCode) && !config.forceDemo,
    model: config.openai.model,
  } as const;
}

"use client";

import type { Encounter } from "../ai/prompt";
import type { RunMode, StructuredNote, Template } from "../templates/types";

export interface ServiceStatus {
  structure: RunMode;
  transcribe: RunMode;
  accessCodeRequired: boolean;
  model: string;
}

async function parseResponse<T>(res: Response): Promise<T> {
  // Sesión caducada: volver al login conservando la página actual.
  if (res.status === 401 && typeof window !== "undefined" && !res.url.includes("/api/auth/")) {
    // Fuera de React no hay router; la recarga completa también limpia el estado del usuario anterior.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function headers(accessCode: string): HeadersInit {
  return accessCode ? { "x-access-code": accessCode } : {};
}

export async function fetchStatus(): Promise<ServiceStatus> {
  return parseResponse(await fetch("/api/status", { cache: "no-store" }));
}

export async function requestTranscription(audio: Blob, filename: string, accessCode: string) {
  const form = new FormData();
  form.append("audio", audio, filename);
  const res = await fetch("/api/transcribe", { method: "POST", body: form, headers: headers(accessCode) });
  return parseResponse<{ text: string; mode: RunMode }>(res);
}

export async function requestStructure(
  input: { template: Template; transcript: string; context?: string; encounter?: Encounter },
  accessCode: string,
) {
  const res = await fetch("/api/structure", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers(accessCode) },
    body: JSON.stringify(input),
  });
  return parseResponse<{ note: StructuredNote; mode: RunMode; ms: number }>(res);
}

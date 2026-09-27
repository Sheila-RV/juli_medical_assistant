import { resolveMode } from "@/lib/config";
import { DEMO_TRANSCRIPT } from "@/lib/ai/demo";
import { TranscribeError, transcribeAudio } from "@/lib/ai/transcribe";
import { accessCodeFrom, enforceRateLimit, jsonError, requireUser } from "@/lib/http";

export const maxDuration = 60;

// Vercel limita el cuerpo de las funciones a ~4.5 MB; el grabador usa un bitrate
// bajo (~24 kbps) para que ~20 min de audio quepan por debajo de este límite.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = /^(audio\/|video\/webm|video\/mp4|application\/octet-stream)/;

export async function POST(request: Request) {
  const auth = requireUser(request);
  if (auth instanceof Response) return auth;
  const limited = enforceRateLimit(request, "transcribe");
  if (limited) return limited;

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("audio");
  } catch {
    return jsonError("Se esperaba multipart/form-data con el campo 'audio'.", 400);
  }
  if (!(file instanceof File) || file.size === 0) return jsonError("No se recibió audio.", 400);
  if (file.size > MAX_BYTES) return jsonError("El audio supera 4 MB. Graba segmentos más cortos.", 413);
  if (file.type && !ALLOWED_TYPES.test(file.type)) return jsonError(`Formato no soportado: ${file.type}`, 415);

  const mode = resolveMode("transcribe", accessCodeFrom(request));
  if (mode === "demo") {
    return Response.json({ text: DEMO_TRANSCRIPT, mode });
  }

  try {
    const text = await transcribeAudio(file);
    return Response.json({ text, mode });
  } catch (error) {
    if (error instanceof TranscribeError) return jsonError(error.message, error.status);
    console.error("transcribe failed", error);
    return jsonError("No se pudo transcribir el audio.", 502);
  }
}

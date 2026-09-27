import "server-only";
import { config } from "../config";

export class TranscribeError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
  ) {
    super(message);
  }
}

/** Pista de vocabulario: mejora la ortografía de términos clínicos. */
export const STT_PROMPT = "Consulta médica en español. Términos clínicos, fármacos, dosis en mg, mililitros, cada 8 horas.";

/**
 * Frases que Whisper "alucina" ante silencio o ruido (vienen de los subtítulos con que se entrenó).
 * Un segmento que solo contiene una de ellas se descarta.
 */
const KNOWN_HALLUCINATIONS = [
  "subtitulos realizados por la comunidad de amara.org",
  "subtitulado por la comunidad de amara.org",
  "gracias por ver el video",
  "gracias por ver",
  "suscribete al canal",
  "no olvides suscribirte",
  "musica",
];

interface WhisperSegment {
  text: string;
  no_speech_prob?: number;
  avg_logprob?: number;
  compression_ratio?: number;
}

interface WhisperResponse {
  text?: string;
  segments?: WhisperSegment[];
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[¡!¿?.,;:()[\]"'«»…-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HALLUCINATION_SET = new Set(KNOWN_HALLUCINATIONS.map(normalize));

/** Heurística de OpenAI para segmentos sin voz, más repeticiones anómalas y frases alucinadas conocidas. */
function isSpurious(seg: WhisperSegment) {
  const noSpeech = seg.no_speech_prob ?? 0;
  const logprob = seg.avg_logprob ?? 0;
  if (noSpeech > 0.6 && logprob < -1) return true;
  if (noSpeech > 0.9) return true;
  if ((seg.compression_ratio ?? 0) > 2.4) return true;
  const n = normalize(seg.text);
  return !n || HALLUCINATION_SET.has(n);
}

/**
 * Limpia la respuesta de Whisper: descarta segmentos sin voz y elimina la pista de vocabulario
 * si el modelo la repite (sucede con audio sin voz). Devuelve "" si no queda contenido real.
 */
export function cleanTranscription(data: WhisperResponse, prompt = STT_PROMPT): string {
  let text = data.segments?.length
    ? data.segments
        .filter((s) => !isSpurious(s))
        .map((s) => s.text.trim())
        .join(" ")
    : (data.text ?? "");

  // Eco de la pista: solo se quitan frases idénticas a una frase del prompt, para no borrar
  // dictado real que coincida en parte (p. ej. "Cada 8 horas.").
  const promptSentences = prompt.split(/(?<=\.)\s+/).map(normalize).filter(Boolean);
  text = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      const n = normalize(sentence);
      return n && !promptSentences.includes(n);
    })
    .join(" ")
    .trim();

  const n = normalize(text);
  // Todo lo que queda es un fragmento de la pista (eco truncado) o una alucinación conocida.
  if (!n || normalize(prompt).includes(n) || HALLUCINATION_SET.has(n)) return "";
  return text;
}

/**
 * Audio → texto con Whisper de OpenAI (o cualquier endpoint compatible con
 * `POST /audio/transcriptions`, p. ej. Groq cambiando STT_BASE_URL).
 */
export async function transcribeAudio(file: File): Promise<string> {
  const isWhisper = /whisper/i.test(config.stt.model);
  const form = new FormData();
  form.append("file", file, file.name || "consulta.webm");
  form.append("model", config.stt.model);
  form.append("language", config.stt.language);
  // Los modelos Whisper devuelven segmentos con probabilidad de "no voz" en verbose_json;
  // los gpt-4o-*-transcribe solo admiten json.
  form.append("response_format", isWhisper ? "verbose_json" : "json");
  form.append("temperature", "0");
  form.append("prompt", STT_PROMPT);

  const res = await fetch(`${config.stt.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.stt.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    if (res.status === 429) throw new TranscribeError("Servicio de transcripción saturado. Intenta de nuevo.", 429);
    if (res.status === 401) throw new TranscribeError("Credenciales de transcripción inválidas en el servidor.", 500);
    if (res.status === 400 || res.status === 413 || res.status === 415) {
      throw new TranscribeError("El proveedor no pudo procesar este audio (formato o tamaño).", 400);
    }
    throw new TranscribeError(`Error del servicio de transcripción (${res.status}).`);
  }

  const text = cleanTranscription((await res.json()) as WhisperResponse);
  if (!text) throw new TranscribeError("No se detectó voz en el audio. Acércate al micrófono y vuelve a intentarlo.", 422);
  return text;
}

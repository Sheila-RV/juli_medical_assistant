import { describe, expect, it } from "vitest";
import { STT_PROMPT, cleanTranscription } from "@/lib/ai/transcribe";

const seg = (text: string, extra: Partial<{ no_speech_prob: number; avg_logprob: number; compression_ratio: number }> = {}) => ({
  text,
  no_speech_prob: 0.01,
  avg_logprob: -0.2,
  compression_ratio: 1.3,
  ...extra,
});

describe("cleanTranscription", () => {
  it("conserva el texto normal", () => {
    expect(cleanTranscription({ text: "Paciente refiere cefalea de dos días." })).toBe("Paciente refiere cefalea de dos días.");
  });

  it("descarta el eco de la pista de vocabulario ante silencio (caso real con Groq)", () => {
    expect(cleanTranscription({ text: "Términos clínicos, fármacos, dosis en mg, mililitros, cada 8 horas." })).toBe("");
    expect(cleanTranscription({ text: STT_PROMPT })).toBe("");
    expect(cleanTranscription({ text: "Términos clínicos, fármacos, dosis en mg" })).toBe("");
  });

  it("no borra dictado real que coincide en parte con la pista", () => {
    const real = "Paracetamol 500 mg. Cada 8 horas.";
    expect(cleanTranscription({ text: real })).toBe(real);
  });

  it("elimina el eco pero conserva lo que se dijo después", () => {
    const text = "Consulta médica en español. Paciente de 30 años con tos.";
    expect(cleanTranscription({ text })).toBe("Paciente de 30 años con tos.");
  });

  it("filtra segmentos sin voz, repetitivos y alucinaciones conocidas", () => {
    const out = cleanTranscription({
      text: "ignorado",
      segments: [
        seg("Paciente masculino de 45 años."),
        seg(" Gracias por ver el video.", { no_speech_prob: 0.3 }),
        seg(" bla bla bla bla bla bla", { compression_ratio: 3.1 }),
        seg(" Algo inventado.", { no_speech_prob: 0.8, avg_logprob: -1.4 }),
        seg(" Tensión arterial 130 sobre 85."),
      ],
    });
    expect(out).toBe("Paciente masculino de 45 años. Tensión arterial 130 sobre 85.");
  });

  it("devuelve vacío si todos los segmentos son ruido", () => {
    expect(cleanTranscription({ segments: [seg("Subtítulos realizados por la comunidad de Amara.org"), seg("...", { no_speech_prob: 0.95 })] })).toBe("");
  });
});

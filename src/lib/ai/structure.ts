import "server-only";
import OpenAI from "openai";
import { config } from "../config";
import { buildNoteValidator, buildOutputSchema } from "../templates/schema";
import type { StructuredNote } from "../templates/types";
import { SYSTEM_PROMPT, buildUserMessage, type StructureInput } from "./prompt";

export class StructureError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
  ) {
    super(message);
  }
}

let client: OpenAI | undefined;
function getClient() {
  client ??= new OpenAI({ apiKey: config.openai.apiKey, maxRetries: 2, timeout: 110_000 });
  return client;
}

// `reasoning.effort` solo lo aceptan los modelos de razonamiento (familia gpt-5 y serie o).
const IS_REASONING_MODEL = /^(gpt-5|gpt-6|o\d)/;

/**
 * Transcripción → nota estructurada con GPT (Responses API).
 *
 * Usa structured outputs (`text.format` con JSON Schema estricto) para que la
 * respuesta cumpla siempre la forma de la plantilla, y valida de nuevo con Zod.
 */
export async function structureWithOpenAI(input: StructureInput): Promise<StructuredNote> {
  const { model, reasoningEffort } = config.openai;

  let response: OpenAI.Responses.Response;
  try {
    response = await getClient().responses.create({
      model,
      instructions: SYSTEM_PROMPT,
      input: buildUserMessage(input),
      max_output_tokens: 16000,
      // Datos clínicos: no dejar la respuesta almacenada en OpenAI.
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "nota_clinica",
          schema: buildOutputSchema(input.template),
          strict: true,
        },
      },
      ...(IS_REASONING_MODEL.test(model) ? { reasoning: { effort: reasoningEffort } } : {}),
    });
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      throw new StructureError("El servicio de IA está saturado o sin saldo. Intenta de nuevo en unos segundos.", 429);
    }
    if (error instanceof OpenAI.AuthenticationError) {
      throw new StructureError("Credenciales de OpenAI inválidas en el servidor.", 500);
    }
    if (error instanceof OpenAI.BadRequestError) {
      throw new StructureError(`Petición rechazada por la API: ${error.message}`, 400);
    }
    if (error instanceof OpenAI.APIError) {
      throw new StructureError(`Error de la API de IA (${error.status ?? "red"}).`, 502);
    }
    throw error;
  }

  if (response.status === "incomplete") {
    const reason = response.incomplete_details?.reason;
    throw new StructureError(
      reason === "max_output_tokens"
        ? "La respuesta excedió el límite de longitud. Prueba con una transcripción más corta."
        : "La IA no completó la respuesta.",
      422,
    );
  }

  const content = response.output.flatMap((item) => (item.type === "message" ? item.content : []));
  if (content.some((c) => c.type === "refusal")) {
    throw new StructureError("El modelo declinó procesar esta transcripción.", 422);
  }

  const raw = content
    .filter((c): c is OpenAI.Responses.ResponseOutputText => c.type === "output_text")
    .map((c) => c.text)
    .join("");
  if (!raw) throw new StructureError("La IA no devolvió contenido.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StructureError("La IA devolvió un JSON inválido.");
  }

  const result = buildNoteValidator(input.template).safeParse(parsed);
  if (!result.success) {
    throw new StructureError("La respuesta de la IA no coincide con la plantilla.");
  }
  return result.data;
}

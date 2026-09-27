import { z } from "zod";
import { resolveMode } from "@/lib/config";
import { demoStructure } from "@/lib/ai/demo";
import { StructureError, structureWithOpenAI } from "@/lib/ai/structure";
import { accessCodeFrom, enforceRateLimit, jsonError, requireUser } from "@/lib/http";
import { TemplateSchema } from "@/lib/templates/types";

export const maxDuration = 120;

const BodySchema = z.object({
  template: TemplateSchema,
  transcript: z.string().trim().min(20, "La transcripción es demasiado corta.").max(60_000),
  context: z.string().max(1_000).optional(),
  encounter: z
    .object({
      captureMode: z.enum(["ambiental", "dictado"]).optional(),
      consultationType: z.string().max(60).optional(),
      sex: z.string().max(10).optional(),
      age: z.string().max(10).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const auth = requireUser(request);
  if (auth instanceof Response) return auth;
  const limited = enforceRateLimit(request, "structure");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON inválido.", 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return jsonError(`${issue.path.join(".") || "body"}: ${issue.message}`, 400);
  }

  const mode = resolveMode("structure", accessCodeFrom(request));
  const started = Date.now();

  if (mode === "demo") {
    return Response.json({ note: demoStructure(parsed.data.template), mode, ms: Date.now() - started });
  }

  try {
    const note = await structureWithOpenAI(parsed.data);
    return Response.json({ note, mode, ms: Date.now() - started });
  } catch (error) {
    if (error instanceof StructureError) return jsonError(error.message, error.status);
    console.error("structure failed", error);
    return jsonError("No se pudo generar la nota.", 502);
  }
}

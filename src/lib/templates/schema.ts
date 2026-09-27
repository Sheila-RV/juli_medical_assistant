import { z } from "zod";
import type { FieldValue, StructuredNote, Template } from "./types";

/**
 * Convierte una plantilla en el JSON Schema que se envía a GPT en
 * `text.format` (modo estricto). Con structured outputs la respuesta está garantizada
 * a cumplir el esquema: todos los campos presentes, sin claves extra.
 *
 * Los campos no mencionados en la consulta se devuelven como "" o [] —
 * nunca se rellenan con suposiciones (ver el prompt en lib/ai/prompt.ts).
 */
export function buildOutputSchema(template: Template): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const field of template.fields) {
    const description = [field.label, field.hint].filter(Boolean).join(": ");
    properties[field.key] =
      field.type === "list"
        ? { type: "array", items: { type: "string" }, description }
        : { type: "string", description };
  }

  return {
    type: "object",
    properties: {
      fields: {
        type: "object",
        properties,
        required: template.fields.map((f) => f.key),
        additionalProperties: false,
      },
      warnings: {
        type: "array",
        items: { type: "string" },
        description:
          "Puntos que el médico debe verificar: datos ambiguos, contradictorios, dosis incompletas o inaudibles.",
      },
    },
    required: ["fields", "warnings"],
    additionalProperties: false,
  };
}

/**
 * Validación en tiempo de ejecución del mismo contrato. Structured outputs ya
 * lo garantiza, pero validamos igualmente: el resultado se muestra a un médico
 * y no queremos confiar ciegamente en una frontera de red.
 */
export function buildNoteValidator(template: Template) {
  const shape: Record<string, z.ZodType<FieldValue>> = {};
  for (const field of template.fields) {
    shape[field.key] = field.type === "list" ? z.array(z.string()) : z.string();
  }
  return z.object({
    fields: z.object(shape).strict(),
    warnings: z.array(z.string()),
  }) as unknown as z.ZodType<StructuredNote>;
}

/** Convierte la nota en texto plano para copiar al expediente electrónico. */
export function noteToPlainText(template: Template, note: StructuredNote): string {
  const lines: string[] = [template.name.toUpperCase(), ""];
  let currentSection: string | undefined;

  for (const field of template.fields) {
    if (field.section && field.section !== currentSection) {
      currentSection = field.section;
      lines.push(`== ${field.section} ==`);
    }
    const value = note.fields[field.key];
    const empty = Array.isArray(value) ? value.length === 0 : !value?.trim();
    lines.push(`${field.label}:`);
    if (empty) {
      lines.push("  (no referido)");
    } else if (Array.isArray(value)) {
      value.forEach((v) => lines.push(`  - ${v}`));
    } else {
      lines.push(`  ${value}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function noteToMarkdown(template: Template, note: StructuredNote): string {
  const lines: string[] = [`# ${template.name}`, ""];
  let currentSection: string | undefined;

  for (const field of template.fields) {
    if (field.section && field.section !== currentSection) {
      currentSection = field.section;
      lines.push(`## ${field.section}`, "");
    }
    const value = note.fields[field.key];
    lines.push(`**${field.label}**`, "");
    if (Array.isArray(value)) {
      lines.push(value.length ? value.map((v) => `- ${v}`).join("\n") : "_No referido_");
    } else {
      lines.push(value?.trim() ? value : "_No referido_");
    }
    lines.push("");
  }
  if (note.warnings.length) {
    lines.push("## Puntos a verificar", "", ...note.warnings.map((w) => `- ${w}`), "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

import { z } from "zod";

/**
 * Una plantilla médica es una lista ordenada de campos. Cada campo se convierte
 * en una propiedad del JSON Schema que el modelo debe rellenar (ver schema.ts).
 */

export const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

export const TemplateFieldSchema = z.object({
  key: z
    .string()
    .regex(FIELD_KEY_PATTERN, "Clave inválida: usa minúsculas, números y guion bajo"),
  label: z.string().trim().min(1).max(80),
  /** Instrucción para la IA: qué información va en este campo. */
  hint: z.string().trim().max(400).default(""),
  /** "text" = párrafo libre, "list" = viñetas (diagnósticos, medicamentos...). */
  type: z.enum(["text", "list"]).default("text"),
  /** Sección visual a la que pertenece (p. ej. "S", "O", "A", "P" en SOAP). */
  section: z.string().trim().max(60).optional(),
});

export const TemplateSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,60}$/),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(300).default(""),
    specialty: z.string().trim().max(60).default("General"),
    fields: z.array(TemplateFieldSchema).min(1).max(40),
    builtIn: z.boolean().optional(),
  })
  .superRefine((tpl, ctx) => {
    const seen = new Set<string>();
    tpl.fields.forEach((f, i) => {
      if (seen.has(f.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", i, "key"],
          message: `Clave duplicada: ${f.key}`,
        });
      }
      seen.add(f.key);
    });
  });

export type TemplateField = z.infer<typeof TemplateFieldSchema>;
export type Template = z.infer<typeof TemplateSchema>;

/** Valor de un campo ya rellenado. */
export type FieldValue = string | string[];

export interface StructuredNote {
  fields: Record<string, FieldValue>;
  /** Puntos que el médico debe verificar: ambigüedades, dosis dudosas, datos contradictorios. */
  warnings: string[];
}

export type RunMode = "live" | "demo";

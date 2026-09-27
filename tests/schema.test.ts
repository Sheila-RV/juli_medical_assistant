import { describe, expect, it } from "vitest";
import { demoStructure } from "@/lib/ai/demo";
import { buildUserMessage } from "@/lib/ai/prompt";
import { PRESET_TEMPLATES, findPreset } from "@/lib/templates/presets";
import { buildNoteValidator, buildOutputSchema, noteToMarkdown, noteToPlainText } from "@/lib/templates/schema";
import { TemplateSchema, type Template } from "@/lib/templates/types";
import { slugifyKey } from "@/components/TemplateEditor";

const soap = findPreset("soap")!;
const presets = PRESET_TEMPLATES.map((t) => [t.id, t] as const);

describe("plantillas incluidas", () => {
  it.each(presets)("%s cumple el esquema de plantilla", (_id, tpl) => {
    expect(TemplateSchema.safeParse(tpl).success).toBe(true);
  });

  it("rechaza claves duplicadas", () => {
    const bad = { ...soap, fields: [soap.fields[0], soap.fields[0]] };
    expect(TemplateSchema.safeParse(bad).success).toBe(false);
  });

  it("rechaza claves con caracteres no permitidos", () => {
    const bad = { ...soap, fields: [{ ...soap.fields[0], key: "Motivo Consulta" }] };
    expect(TemplateSchema.safeParse(bad).success).toBe(false);
  });
});

describe("buildOutputSchema", () => {
  const schema = buildOutputSchema(soap) as {
    required: string[];
    additionalProperties: boolean;
    properties: {
      fields: { properties: Record<string, { type: string }>; required: string[]; additionalProperties: boolean };
    };
  };

  it("exige todos los campos y prohíbe claves extra (requisito de structured outputs)", () => {
    expect(schema.required).toEqual(["fields", "warnings"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.fields.additionalProperties).toBe(false);
    expect(schema.properties.fields.required).toEqual(soap.fields.map((f) => f.key));
  });

  it("mapea listas a arrays y textos a strings", () => {
    expect(schema.properties.fields.properties.diagnosticos.type).toBe("array");
    expect(schema.properties.fields.properties.subjetivo.type).toBe("string");
  });
});

describe("buildNoteValidator", () => {
  const validate = buildNoteValidator(soap);

  it("acepta la nota demo de SOAP", () => {
    expect(validate.safeParse(demoStructure(soap)).success).toBe(true);
  });

  it("rechaza tipos incorrectos y campos desconocidos", () => {
    const note = demoStructure(soap);
    expect(validate.safeParse({ ...note, fields: { ...note.fields, diagnosticos: "texto" } }).success).toBe(false);
    expect(validate.safeParse({ ...note, fields: { ...note.fields, extra: "x" } }).success).toBe(false);
  });
});

describe("demoStructure", () => {
  it.each(presets)("%s produce una nota válida", (_id, tpl) => {
    expect(buildNoteValidator(tpl).safeParse(demoStructure(tpl)).success).toBe(true);
  });

  it("deja vacíos y avisa de los campos personalizados", () => {
    const custom: Template = TemplateSchema.parse({
      id: "custom-x",
      name: "Prenatal",
      fields: [{ key: "semanas_gestacion", label: "Semanas de gestación" }],
    });
    const note = demoStructure(custom);
    expect(note.fields.semanas_gestacion).toBe("");
    expect(note.warnings.at(-1)).toContain("Semanas de gestación");
  });
});

describe("exportación", () => {
  const note = demoStructure(soap);

  it("texto plano incluye secciones y marca campos vacíos", () => {
    const text = noteToPlainText(soap, { ...note, fields: { ...note.fields, estudios_solicitados: [] } });
    expect(text).toContain("== S · Subjetivo ==");
    expect(text).toContain("  - Amoxicilina 500 mg VO cada 8 h por 10 días");
    expect(text).toMatch(/Estudios solicitados:\n {2}\(no referido\)/);
  });

  it("markdown incluye los avisos", () => {
    expect(noteToMarkdown(soap, note)).toContain("## Puntos a verificar");
  });
});

describe("buildUserMessage", () => {
  it("envuelve la transcripción y lista cada campo", () => {
    const msg = buildUserMessage({ template: soap, transcript: "  Paciente refiere cefalea.  ", context: "Adulto mayor" });
    expect(msg).toContain("<transcripcion>\nPaciente refiere cefalea.\n</transcripcion>");
    expect(msg).toContain("- diagnosticos (lista) — Diagnósticos");
    expect(msg).toContain("Adulto mayor");
  });
});

describe("slugifyKey", () => {
  it("genera claves válidas desde etiquetas en español", () => {
    expect(slugifyKey("Tensión arterial")).toBe("tension_arterial");
    expect(slugifyKey("¿Semanas de gestación?")).toBe("semanas_de_gestacion");
    expect(slugifyKey("1er trimestre")).toBe("campo_1er_trimestre");
  });
});

import { describe, expect, it } from "vitest";
import { demoStructure } from "@/lib/ai/demo";
import { buildUserMessage } from "@/lib/ai/prompt";
import { toFhirBundle } from "@/lib/export/fhir";
import {
  emptyNote,
  isBlankReport,
  newReport,
  noteHasContent,
  patientSummary,
  primaryDiagnosis,
  reportSearchText,
} from "@/lib/reports/helpers";
import { findPreset } from "@/lib/templates/presets";

const soap = findPreset("soap")!;
const soapBreve = findPreset("soap-breve")!;

describe("informes", () => {
  it("un informe nuevo es un borrador vacío con la nota de su plantilla", () => {
    const r = newReport(soapBreve);
    expect(r.status).toBe("borrador");
    expect(Object.keys(r.note.fields)).toEqual(["subjetivo", "objetivo", "analisis", "plan_general"]);
    expect(isBlankReport(r)).toBe(true);
    expect(noteHasContent(r.note)).toBe(false);
  });

  it("deja de estar vacío con transcripción, audio o datos del paciente", () => {
    const r = newReport(soapBreve);
    expect(isBlankReport({ ...r, transcript: "Paciente refiere…" })).toBe(false);
    expect(isBlankReport({ ...r, audioIds: ["a1"] })).toBe(false);
    expect(isBlankReport({ ...r, patient: { ...r.patient, name: "Juan" } })).toBe(false);
  });

  it("una lista con solo líneas vacías no cuenta como contenido", () => {
    const note = emptyNote(soap);
    note.fields.diagnosticos = ["", "  "];
    expect(noteHasContent(note)).toBe(false);
  });

  it("resume al paciente como en la cabecera", () => {
    expect(patientSummary({ name: "Juan Pérez", sex: "Masc", age: "45", externalId: "98234-A" })).toBe("Masc, 45 años • ID: 98234-A");
    expect(patientSummary({ name: "", sex: "", age: "", externalId: "" })).toBe("");
  });

  it("busca sin acentos por paciente y diagnóstico", () => {
    const r = { ...newReport(soap), note: demoStructure(soap) };
    r.patient.name = "José Núñez";
    expect(reportSearchText(r)).toContain("jose nunez");
    expect(reportSearchText(r)).toContain("faringoamigdalitis");
    expect(primaryDiagnosis(r)).toBe("Faringoamigdalitis aguda, probablemente estreptocócica");
  });
});

describe("exportación FHIR", () => {
  const report = {
    ...newReport(soap),
    status: "aprobado" as const,
    approvedAt: "2026-09-26T10:00:00.000Z",
    patient: { name: "Juan <Pérez>", sex: "Masc" as const, age: "45", externalId: "98234-A" },
    note: (() => {
      const n = demoStructure(soap);
      n.fields.motivo_consulta = "Dolor <script>alert(1)</script> & fiebre";
      return n;
    })(),
  };
  const bundle = toFhirBundle(report, "Dr. Martínez - Cardiología");
  const composition = bundle.entry[0].resource as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const patient = bundle.entry[1].resource as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  it("genera un Bundle document con Composition final y Patient", () => {
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("document");
    expect(composition.resourceType).toBe("Composition");
    expect(composition.status).toBe("final");
    expect(composition.author[0].display).toBe("Dr. Martínez - Cardiología");
    expect(patient.gender).toBe("male");
    expect(patient.identifier[0].value).toBe("98234-A");
  });

  it("agrupa por secciones SOAP y escapa el HTML", () => {
    expect(composition.section.map((s: { title: string }) => s.title)).toEqual(["Subjetivo", "Objetivo", "Análisis", "Plan"]);
    expect(composition.section[0].text.div).toContain('xmlns="http://www.w3.org/1999/xhtml"');
    const div = composition.section[0].text.div as string;
    expect(div).toContain("Dolor &lt;script&gt;alert(1)&lt;/script&gt; &amp; fiebre");
    expect(div).not.toContain("<script>");
  });
});

describe("contexto del encuentro en el prompt", () => {
  it("incluye modo de captura, tipo de consulta y demografía, sin nombre ni ID", () => {
    const msg = buildUserMessage({
      template: soapBreve,
      transcript: "Paciente refiere dolor torácico.",
      encounter: { captureMode: "dictado", consultationType: "Urgencia", sex: "Fem", age: "62" },
    });
    expect(msg).toContain("dictado del médico");
    expect(msg).toContain("Tipo de consulta: Urgencia.");
    expect(msg).toContain("Paciente: Fem, 62 años.");
  });
});

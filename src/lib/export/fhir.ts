import type { Report } from "../reports/types";

/**
 * Exporta un informe como Bundle FHIR R4 de tipo "document" (Composition + Patient),
 * el formato estándar para intercambiar documentos clínicos con un expediente electrónico.
 */

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const GENDER: Record<string, string> = { Masc: "male", Fem: "female", Otro: "other" };

export function toFhirBundle(report: Report, author: string) {
  const patientUrn = `urn:uuid:${report.id}-patient`;
  const groups: { title: string; parts: string[] }[] = [];

  for (const field of report.template.fields) {
    const title = field.section?.split("·").pop()?.trim() || field.label;
    let group = groups.at(-1);
    if (!group || group.title !== title) {
      group = { title, parts: [] };
      groups.push(group);
    }
    const value = report.note.fields[field.key];
    const items = (Array.isArray(value) ? value : [value ?? ""]).map((v) => v.trim()).filter(Boolean);
    if (!items.length) continue;
    const body = Array.isArray(value)
      ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
      : `<p>${escapeHtml(items[0])}</p>`;
    group.parts.push(`<p><b>${escapeHtml(field.label)}</b></p>${body}`);
  }

  const patient: Record<string, unknown> = { resourceType: "Patient", gender: GENDER[report.patient.sex] ?? "unknown" };
  if (report.patient.name.trim()) patient.name = [{ text: report.patient.name.trim() }];
  if (report.patient.externalId.trim()) patient.identifier = [{ value: report.patient.externalId.trim() }];

  return {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    identifier: { system: "urn:juli:report", value: report.id },
    entry: [
      {
        fullUrl: `urn:uuid:${report.id}`,
        resource: {
          resourceType: "Composition",
          status: report.status === "aprobado" ? "final" : "preliminary",
          type: { text: report.template.name },
          date: report.approvedAt ?? report.updatedAt,
          title: `${report.template.name} — ${report.consultationType}`,
          subject: { reference: patientUrn, display: report.patient.name.trim() || undefined },
          author: [{ display: author || "Profesional de salud" }],
          section: groups
            .filter((g) => g.parts.length)
            .map((g) => ({
              title: g.title,
              text: { status: "generated", div: `<div xmlns="http://www.w3.org/1999/xhtml">${g.parts.join("")}</div>` },
            })),
        },
      },
      { fullUrl: patientUrn, resource: patient },
    ],
  };
}

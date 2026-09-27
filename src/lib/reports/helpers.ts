import type { FieldValue, StructuredNote, Template } from "../templates/types";
import { EMPTY_PATIENT, type Patient, type Report } from "./types";

export function emptyNote(template: Template): StructuredNote {
  const fields: Record<string, FieldValue> = {};
  for (const f of template.fields) fields[f.key] = f.type === "list" ? [] : "";
  return { fields, warnings: [] };
}

export function isEmptyValue(value: FieldValue | undefined) {
  return Array.isArray(value) ? value.every((v) => !v.trim()) : !value?.trim();
}

export function noteHasContent(note: StructuredNote) {
  return Object.values(note.fields).some((v) => !isEmptyValue(v));
}

export function patientHasData(p: Patient) {
  return Boolean(p.name.trim() || p.age.trim() || p.externalId.trim() || p.sex);
}

/** Un borrador sin nada escrito, grabado ni generado: se puede descartar sin preguntar. */
export function isBlankReport(r: Report) {
  return (
    r.status === "borrador" &&
    !r.transcript.trim() &&
    r.audioIds.length === 0 &&
    !patientHasData(r.patient) &&
    !noteHasContent(r.note)
  );
}

export function patientDisplayName(p: Patient) {
  return p.name.trim() || "Paciente sin identificar";
}

/** "Masc, 45 años • ID: 98234-A" */
export function patientSummary(p: Patient) {
  const demo = [p.sex, p.age.trim() && `${p.age.trim()} años`].filter(Boolean).join(", ");
  return [demo, p.externalId.trim() && `ID: ${p.externalId.trim()}`].filter(Boolean).join(" • ");
}

export function newReport(template: Template, consultationType = "Consulta de seguimiento"): Report {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "borrador",
    patient: { ...EMPTY_PATIENT },
    consultationType,
    captureMode: "ambiental",
    template,
    transcript: "",
    note: emptyNote(template),
    audioIds: [],
  };
}

/** Texto libre en el que buscar desde la gestión de informes (paciente, consulta y toda la nota). */
export function reportSearchText(r: Report) {
  const noteText = Object.values(r.note.fields).flat().join(" ");
  return [r.patient.name, r.patient.externalId, r.consultationType, r.template.name, noteText]
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Diagnóstico principal para listados; en plantillas sin campo de diagnóstico, la primera frase del análisis. */
export function primaryDiagnosis(r: Report): string {
  for (const key of ["diagnosticos", "impresion_diagnostica", "diagnostico", "analisis"]) {
    const v = r.note.fields[key];
    if (Array.isArray(v) && v[0]?.trim()) return v[0];
    if (typeof v === "string" && v.trim()) return v.split(/(?<=\.)\s/)[0];
  }
  return "";
}

export function formatDuration(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

import type { RunMode, StructuredNote, Template } from "../templates/types";

export type ReportStatus = "borrador" | "aprobado";

/** "ambiental" = conversación médico-paciente grabada; "dictado" = el médico dicta en voz alta. */
export type CaptureMode = "ambiental" | "dictado";

export const CONSULTATION_TYPES = [
  "Primera vez",
  "Consulta de seguimiento",
  "Control",
  "Urgencia",
  "Interconsulta",
  "Telemedicina",
] as const;

export const SEX_OPTIONS = ["", "Masc", "Fem", "Otro"] as const;
export type Sex = (typeof SEX_OPTIONS)[number];

export interface Patient {
  name: string;
  sex: Sex;
  age: string;
  externalId: string;
}

export interface Report {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ReportStatus;
  approvedAt?: string;
  patient: Patient;
  consultationType: string;
  captureMode: CaptureMode;
  /** Copia de la plantilla: el informe sigue siendo legible aunque la plantilla cambie. */
  template: Template;
  transcript: string;
  note: StructuredNote;
  generatedAt?: string;
  generationMode?: RunMode;
  audioIds: string[];
}

export interface AudioMeta {
  id: string;
  reportId: string;
  createdAt: string;
  durationSec: number;
  mimeType: string;
  size: number;
  name: string;
  source: "grabacion" | "archivo";
  /** "servidor" = transcrito por la API; "navegador" = dictado en vivo; null = pendiente. */
  transcribedBy: "servidor" | "navegador" | null;
}

export interface Profile {
  name: string;
  specialty: string;
  dictationLang: string;
  defaultTemplateId: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  specialty: "",
  dictationLang: "es-ES",
  defaultTemplateId: "soap-breve",
};

export const EMPTY_PATIENT: Patient = { name: "", sex: "", age: "", externalId: "" };

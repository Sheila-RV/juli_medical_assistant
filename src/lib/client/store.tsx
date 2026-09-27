"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PublicUser } from "../auth/users";
import { PRESET_TEMPLATES } from "../templates/presets";
import type { Template } from "../templates/types";
import { emptyNote, isBlankReport, newReport } from "../reports/helpers";
import { DEFAULT_PROFILE, type AudioMeta, type Profile, type Report } from "../reports/types";
import { fetchStatus, requestStructure, requestTranscription, type ServiceStatus } from "./api";
import { audioDb } from "./audio-db";
import { useStoredState } from "./storage";

type Busy = "transcribing" | "structuring";
type ReportUpdater = Partial<Report> | ((r: Report) => Partial<Report>);

interface AppState {
  /** Médico con sesión iniciada (null solo en la pantalla de login). */
  user: PublicUser | null;
  logout: () => Promise<void>;
  loaded: boolean;
  status: ServiceStatus | null;
  profile: Profile;
  accessCode: string;
  reports: Report[];
  audios: AudioMeta[];
  templates: Template[];
  customTemplates: Template[];
  busy: Record<string, Busy | undefined>;
  errors: Record<string, string | undefined>;
  /** Último informe abierto en la vista de consulta. */
  activeId: string;
  setActiveId: (id: string) => void;

  setProfile: (p: Profile) => void;
  setAccessCode: (code: string) => void;
  createReport: (templateId?: string) => string;
  updateReport: (id: string, updater: ReportUpdater) => void;
  deleteReport: (id: string) => Promise<void>;
  changeTemplate: (id: string, template: Template) => void;
  addAudio: (reportId: string, blob: Blob, meta: Pick<AudioMeta, "durationSec" | "source" | "name" | "transcribedBy">) => Promise<string>;
  deleteAudio: (audioId: string) => Promise<void>;
  transcribe: (reportId: string, audioId: string) => Promise<void>;
  process: (reportId: string) => Promise<void>;
  clearError: (reportId: string) => void;
  saveTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return ctx;
}

export function AppProvider({ user, children }: { user: PublicUser | null; children: React.ReactNode }) {
  // Cada médico tiene su propio espacio en el navegador: informes, audios y plantillas no se mezclan.
  const ns = `juli:${user?.id ?? "anon"}`;
  const [reports, setReports, reportsLoaded] = useStoredState<Report[]>(`${ns}:reports`, []);
  const [audios, setAudios, audiosLoaded] = useStoredState<AudioMeta[]>(`${ns}:audios`, []);
  const [customTemplates, setCustomTemplates] = useStoredState<Template[]>(`${ns}:templates`, []);
  const [profile, setProfile] = useStoredState<Profile>(`${ns}:profile`, {
    ...DEFAULT_PROFILE,
    name: user?.name ?? "",
    specialty: user?.specialty ?? "",
  });
  const [accessCode, setAccessCode] = useStoredState("juli:access-code", "");
  const [activeId, setActiveId] = useStoredState(`${ns}:active-report`, "");
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [busy, setBusy] = useState<Record<string, Busy | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Refs para leer el estado más reciente dentro de acciones asíncronas.
  const reportsRef = useRef(reports);
  const accessRef = useRef(accessCode);
  useEffect(() => {
    reportsRef.current = reports;
    accessRef.current = accessCode;
  });

  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const templates = useMemo(() => [...PRESET_TEMPLATES, ...customTemplates], [customTemplates]);

  const updateReport = useCallback(
    (id: string, updater: ReportUpdater) => {
      setReports((list) =>
        list.map((r) => {
          if (r.id !== id) return r;
          const patch = typeof updater === "function" ? updater(r) : updater;
          return { ...r, ...patch, updatedAt: new Date().toISOString() };
        }),
      );
    },
    [setReports],
  );

  const setError = (id: string, message: string | undefined) => setErrors((e) => ({ ...e, [id]: message }));
  const setBusyFor = (id: string, value: Busy | undefined) => setBusy((b) => ({ ...b, [id]: value }));

  const createReport = useCallback(
    (templateId?: string) => {
    const all = [...PRESET_TEMPLATES, ...customTemplates];
    const template =
      all.find((t) => t.id === templateId) ?? all.find((t) => t.id === profile.defaultTemplateId) ?? PRESET_TEMPLATES[0];
    const report = newReport(template);
    // Los borradores vacíos que quedaron abandonados se descartan al abrir uno nuevo.
    setReports((list) => [report, ...list.filter((r) => !isBlankReport(r))]);
    return report.id;
    },
    [customTemplates, profile.defaultTemplateId, setReports],
  );

  const deleteAudio = useCallback(
    async (audioId: string) => {
      await audioDb.delete(audioId).catch(() => {});
      setAudios((list) => list.filter((a) => a.id !== audioId));
      setReports((list) =>
        list.map((r) => (r.audioIds.includes(audioId) ? { ...r, audioIds: r.audioIds.filter((x) => x !== audioId) } : r)),
      );
    },
    [setAudios, setReports],
  );

  const deleteReport = useCallback(
    async (id: string) => {
      const report = reportsRef.current.find((r) => r.id === id);
      await Promise.all((report?.audioIds ?? []).map((a) => audioDb.delete(a).catch(() => {})));
      setAudios((list) => list.filter((a) => a.reportId !== id));
      setReports((list) => list.filter((r) => r.id !== id));
    },
    [setAudios, setReports],
  );

  const changeTemplate = useCallback(
    (id: string, template: Template) => {
      updateReport(id, { template, note: emptyNote(template), generatedAt: undefined, generationMode: undefined });
    },
    [updateReport],
  );

  const addAudio = useCallback<AppState["addAudio"]>(
    async (reportId, blob, meta) => {
      const id = crypto.randomUUID();
      await audioDb.put(id, blob);
      const record: AudioMeta = {
        id,
        reportId,
        createdAt: new Date().toISOString(),
        mimeType: blob.type || "audio/webm",
        size: blob.size,
        ...meta,
      };
      setAudios((list) => [record, ...list]);
      updateReport(reportId, (r) => ({ audioIds: [...r.audioIds, id] }));
      return id;
    },
    [setAudios, updateReport],
  );

  const transcribe = useCallback<AppState["transcribe"]>(
    async (reportId, audioId) => {
      setError(reportId, undefined);
      setBusyFor(reportId, "transcribing");
      try {
        const blob = await audioDb.get(audioId);
        if (!blob) throw new Error("No se encontró el audio en este navegador.");
        const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const { text } = await requestTranscription(blob, `consulta.${ext}`, accessRef.current);
        updateReport(reportId, (r) => ({ transcript: r.transcript.trim() ? `${r.transcript.trim()}\n\n${text}` : text }));
        setAudios((list) => list.map((a) => (a.id === audioId ? { ...a, transcribedBy: "servidor" } : a)));
      } catch (e) {
        setError(reportId, e instanceof Error ? e.message : "Error al transcribir.");
      } finally {
        setBusyFor(reportId, undefined);
      }
    },
    [setAudios, updateReport],
  );

  const process = useCallback<AppState["process"]>(
    async (reportId) => {
      const report = reportsRef.current.find((r) => r.id === reportId);
      if (!report) return;
      setError(reportId, undefined);
      setBusyFor(reportId, "structuring");
      try {
        const { note, mode } = await requestStructure(
          {
            template: report.template,
            transcript: report.transcript,
            encounter: {
              captureMode: report.captureMode,
              consultationType: report.consultationType,
              sex: report.patient.sex || undefined,
              age: report.patient.age.trim() || undefined,
            },
          },
          accessRef.current,
        );
        updateReport(reportId, { note, generationMode: mode, generatedAt: new Date().toISOString() });
      } catch (e) {
        setError(reportId, e instanceof Error ? e.message : "Error al generar la nota.");
      } finally {
        setBusyFor(reportId, undefined);
      }
    },
    [updateReport],
  );

  const saveTemplate = useCallback(
    (t: Template) =>
      setCustomTemplates((list) => (list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t])),
    [setCustomTemplates],
  );

  const deleteTemplate = useCallback(
    (id: string) => setCustomTemplates((list) => list.filter((t) => t.id !== id)),
    [setCustomTemplates],
  );

  const resetAll = useCallback(async () => {
    // Solo los audios de este médico: el almacén de IndexedDB es compartido entre usuarios.
    await Promise.all(audios.map((a) => audioDb.delete(a.id).catch(() => {})));
    setReports([]);
    setAudios([]);
    setCustomTemplates([]);
  }, [audios, setAudios, setCustomTemplates, setReports]);

  const router = useRouter();
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    // refresh() vuelve a renderizar el layout del servidor, que ya no encuentra sesión.
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value: AppState = {
    user,
    logout,
    loaded: reportsLoaded && audiosLoaded,
    status,
    profile,
    accessCode,
    reports,
    audios,
    templates,
    customTemplates,
    busy,
    errors,
    activeId,
    setActiveId,
    setProfile,
    setAccessCode,
    createReport,
    updateReport,
    deleteReport,
    changeTemplate,
    addAudio,
    deleteAudio,
    transcribe,
    process,
    clearError: (id) => setError(id, undefined),
    saveTemplate,
    deleteTemplate,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { audioDb } from "@/lib/client/audio-db";
import { useApp } from "@/lib/client/store";
import { formatBytes, formatDuration, patientDisplayName } from "@/lib/reports/helpers";
import type { AudioMeta } from "@/lib/reports/types";
import { useAudioUrl } from "../audio/AudioPlayer";
import { Spinner } from "../consult/CapturePanel";
import { Icon } from "../ui/Icon";
import { EmptyState, PageHeader, StatCard } from "./PageHeader";

function TranscriptionBadge({ by }: { by: AudioMeta["transcribedBy"] }) {
  if (by === "servidor") return <span className="badge bg-primary-soft text-primary">Transcrito con IA</span>;
  if (by === "navegador") return <span className="badge bg-success-soft text-success">Dictado en vivo</span>;
  return <span className="badge bg-warn-soft text-warn">Sin transcribir</span>;
}

function AudioRow({ audio }: { audio: AudioMeta }) {
  const { reports, busy, transcribe, deleteAudio } = useApp();
  const { url, missing } = useAudioUrl(audio.id);
  const report = reports.find((r) => r.id === audio.reportId);
  const isBusy = busy[audio.reportId] === "transcribing";
  const canTranscribe = report && report.status !== "aprobado" && !audio.transcribedBy;

  async function downloadAudio() {
    const blob = await audioDb.get(audio.id);
    if (!blob) return;
    const ext = audio.mimeType.includes("mp4") ? "m4a" : audio.mimeType.includes("ogg") ? "ogg" : "webm";
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = audio.source === "archivo" ? audio.name : `${(report?.patient.name || "consulta").replace(/\s+/g, "-")}-${audio.createdAt.slice(0, 16).replace(/[:T]/g, "")}.${ext}`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <li className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon name={audio.source === "archivo" ? "upload" : "mic"} size={18} />
        </span>
        <div className="min-w-0">
          {report ? (
            <Link href={`/?id=${report.id}`} className="font-medium hover:text-primary">
              {patientDisplayName(report.patient)}
            </Link>
          ) : (
            <span className="font-medium text-ink-faint">Informe eliminado</span>
          )}
          <p className="text-xs text-ink-faint">
            {audio.name} · {new Date(audio.createdAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
            {formatDuration(audio.durationSec)} · {formatBytes(audio.size)}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <TranscriptionBadge by={audio.transcribedBy} />
            {report && <span className="badge bg-surface-2 text-ink-soft">{report.template.name}</span>}
          </div>
        </div>
      </div>

      {missing ? (
        <p className="text-xs text-ink-faint">Archivo no disponible en este navegador</p>
      ) : (
        url && <audio controls src={url} preload="metadata" className="h-10 w-full md:w-72" />
      )}

      <div className="flex shrink-0 items-center gap-1">
        {canTranscribe && (
          <button type="button" className="btn btn-ghost px-3 py-1.5 text-xs" disabled={isBusy} onClick={() => transcribe(audio.reportId, audio.id)}>
            {isBusy ? <Spinner /> : <Icon name="sparkles" size={14} />} Transcribir
          </button>
        )}
        <button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-surface-2" onClick={downloadAudio} disabled={missing} aria-label="Descargar audio">
          <Icon name="download" size={16} />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-ink-faint hover:bg-danger-soft hover:text-danger"
          onClick={() => confirm("¿Eliminar este audio? La transcripción del informe se conserva.") && deleteAudio(audio.id)}
          aria-label="Eliminar audio"
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  );
}

export function AudiosView() {
  const { loaded, audios, reports } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | "pendientes">("todos");
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 }))
      .catch(() => {});
  }, [audios.length]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return audios
      .filter((a) => filter === "todos" || !a.transcribedBy)
      .filter((a) => {
        if (!q) return true;
        const r = reports.find((x) => x.id === a.reportId);
        return `${r?.patient.name ?? ""} ${r?.patient.externalId ?? ""} ${a.name}`.toLowerCase().includes(q);
      });
  }, [audios, reports, query, filter]);

  const totalSec = audios.reduce((s, a) => s + a.durationSec, 0);
  const totalBytes = audios.reduce((s, a) => s + a.size, 0);
  const pending = audios.filter((a) => !a.transcribedBy).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Audios" description="Grabaciones de las consultas, guardadas en este navegador (IndexedDB)." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Audios" value={audios.length} tone="primary" />
        <StatCard label="Duración total" value={formatDuration(totalSec)} />
        <StatCard label="Sin transcribir" value={pending} tone={pending ? "warn" : "default"} />
        <StatCard
          label="Espacio usado"
          value={formatBytes(totalBytes)}
          hint={usage?.quota ? `de ${formatBytes(usage.quota)} disponibles` : undefined}
        />
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-56 flex-1">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="input pl-9" placeholder="Buscar por paciente…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar audios" />
        </div>
        <div className="flex rounded-lg bg-surface-2 p-1 text-sm" role="group" aria-label="Filtrar audios">
          {(["todos", "pendientes"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 font-medium ${filter === f ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              {f === "todos" ? "Todos" : "Sin transcribir"}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <div className="card h-40 animate-pulse" />
      ) : audios.length === 0 ? (
        <EmptyState title="Aún no hay audios">
          Los audios que grabes o subas en una <Link href="/" className="font-medium text-primary hover:underline">consulta</Link> aparecerán aquí
          para reproducirlos, descargarlos o volver a transcribirlos.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin resultados">Prueba con otra búsqueda.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => (
            <AudioRow key={a.id} audio={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

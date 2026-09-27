"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEMO_TRANSCRIPT } from "@/lib/ai/demo";
import { useApp } from "@/lib/client/store";
import { isBlankReport, patientDisplayName, patientSummary } from "@/lib/reports/helpers";
import { Icon } from "../ui/Icon";
import { CapturePanel } from "./CapturePanel";
import { ExportDialog } from "./ExportDialog";
import { NotePanel } from "./NotePanel";
import { PatientBar } from "./PatientBar";

export function ConsultView() {
  const params = useSearchParams();
  const router = useRouter();
  const { loaded, reports, createReport } = useApp();
  const id = params.get("id");
  const creating = useRef(false);

  // Sin ?id se abre una consulta nueva (una sola vez, aunque React monte dos veces en desarrollo).
  useEffect(() => {
    if (!loaded || id || creating.current) return;
    creating.current = true;
    router.replace(`/?id=${createReport()}`);
  }, [loaded, id, createReport, router]);

  if (!loaded || !id) return <Skeleton />;
  if (!reports.some((r) => r.id === id)) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <Icon name="file" size={36} className="mx-auto text-ink-faint" />
        <h2 className="mt-4 text-lg font-semibold">Informe no encontrado</h2>
        <p className="mt-1 text-sm text-ink-soft">Puede que se haya eliminado o que pertenezca a otro navegador.</p>
        <Link href="/informes" className="btn btn-primary mt-6">
          Ver informes
        </Link>
      </div>
    );
  }
  return <Consult key={id} id={id} />;
}

function Skeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" aria-busy="true">
      <div className="card h-[520px] animate-pulse" />
      <div className="card h-[520px] animate-pulse" />
    </div>
  );
}

function Consult({ id }: { id: string }) {
  const router = useRouter();
  const app = useApp();
  const report = app.reports.find((r) => r.id === id)!;
  const audios = app.audios.filter((a) => a.reportId === id);
  const busy = app.busy[id];
  const error = app.errors[id];
  const approved = report.status === "aprobado";
  const [exporting, setExporting] = useState(false);
  const author = [app.profile.name, app.profile.specialty].filter(Boolean).join(" - ");

  const { setActiveId } = app;
  useEffect(() => setActiveId(id), [id, setActiveId]);

  async function handleAudio(blob: Blob, info: { durationSec: number; source: "grabacion" | "archivo"; name: string; live: boolean }) {
    try {
      const audioId = await app.addAudio(id, blob, {
        durationSec: info.durationSec,
        source: info.source,
        name: info.name,
        transcribedBy: info.live ? "navegador" : null,
      });
      if (!info.live) await app.transcribe(id, audioId);
    } catch {
      alert("No se pudo guardar el audio en este navegador (¿almacenamiento lleno o modo privado?).");
    }
  }

  function loadSample() {
    if (report.transcript.trim() && !confirm("¿Reemplazar la transcripción actual por la consulta de ejemplo?")) return;
    app.updateReport(id, { transcript: DEMO_TRANSCRIPT, captureMode: "ambiental" });
  }

  async function discard() {
    const hasAudio = report.audioIds.length > 0;
    if (!isBlankReport(report) && !confirm(`¿Descartar este borrador${hasAudio ? " y sus audios" : ""}? No se puede deshacer.`)) return;
    await app.deleteReport(id);
    router.replace(`/?id=${app.createReport()}`);
  }

  function approve() {
    app.updateReport(id, { status: "aprobado", approvedAt: new Date().toISOString() });
    setExporting(true);
  }

  return (
    <>
      <PatientBar
        patient={report.patient}
        consultationType={report.consultationType}
        readOnly={approved}
        onChange={(patch) => app.updateReport(id, patch)}
      />

      {/* Cabecera solo para impresión */}
      <div className="hidden px-6 pt-4 text-sm print:block">
        <p className="font-semibold">{patientDisplayName(report.patient)}</p>
        <p>
          {patientSummary(report.patient)} · {report.consultationType} ·{" "}
          {new Date(report.createdAt).toLocaleString("es", { dateStyle: "long", timeStyle: "short" })}
        </p>
        {author && <p>{author}</p>}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error && (
          <div role="alert" className="no-print mb-6 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            <Icon name="alert" size={18} className="mt-0.5" />
            <p className="flex-1">{error}</p>
            <button type="button" onClick={() => app.clearError(id)} aria-label="Cerrar aviso">
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        {app.status?.accessCodeRequired && !app.accessCode && (
          <p className="no-print mb-6 flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-soft">
            <Icon name="lock" size={16} /> Esta instancia usa IA real solo con código de acceso. Añádelo en{" "}
            <Link href="/ajustes" className="font-medium text-primary hover:underline">
              Ajustes
            </Link>
            ; mientras tanto verás resultados de demostración.
          </p>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="no-print">
            <CapturePanel
              report={report}
              audios={audios}
              busy={busy}
              readOnly={approved}
              speechLang={app.profile.dictationLang}
              onModeChange={(captureMode) => app.updateReport(id, { captureMode })}
              onTranscriptChange={(transcript) => app.updateReport(id, { transcript })}
              onAppendTranscript={(text) =>
                app.updateReport(id, (r) => ({ transcript: r.transcript.trim() ? `${r.transcript.trimEnd()} ${text}` : text }))
              }
              onAudio={handleAudio}
              onProcess={() => app.process(id)}
              onLoadSample={loadSample}
            />
          </div>
          <NotePanel
            report={report}
            templates={app.templates}
            busy={busy}
            onTemplateChange={(t) => app.changeTemplate(id, t)}
            onNoteChange={(note) => app.updateReport(id, { note })}
            onDiscard={discard}
            onApprove={approve}
            onReopen={() => app.updateReport(id, { status: "borrador", approvedAt: undefined })}
            onExport={() => setExporting(true)}
          />
        </div>
      </div>

      {exporting && <ExportDialog report={report} author={author} onClose={() => setExporting(false)} />}
    </>
  );
}

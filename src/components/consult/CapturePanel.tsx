"use client";

import { useRef, useState } from "react";
import { useDictation, useSpeechSupport } from "@/lib/client/use-dictation";
import { useRecorder } from "@/lib/client/use-recorder";
import { formatDuration } from "@/lib/reports/helpers";
import type { AudioMeta, CaptureMode, Report } from "@/lib/reports/types";
import { AudioChip } from "../audio/AudioPlayer";
import { Icon } from "../ui/Icon";

const MAX_UPLOAD = 4 * 1024 * 1024;

interface Props {
  report: Report;
  audios: AudioMeta[];
  busy?: "transcribing" | "structuring";
  readOnly: boolean;
  speechLang: string;
  onModeChange: (mode: CaptureMode) => void;
  onTranscriptChange: (text: string) => void;
  onAppendTranscript: (text: string) => void;
  onAudio: (blob: Blob, info: { durationSec: number; source: AudioMeta["source"]; name: string; live: boolean }) => void;
  onProcess: () => void;
  onLoadSample: () => void;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}

export function CapturePanel(props: Props) {
  const { report, audios, busy, readOnly, speechLang } = props;
  const mode = report.captureMode;
  const speechSupported = useSpeechSupport();
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dictation = useDictation((text) => props.onAppendTranscript(text));
  const recorder = useRecorder((blob, durationSec) =>
    props.onAudio(blob, {
      durationSec,
      source: "grabacion",
      name: mode === "dictado" ? "Dictado" : "Consulta",
      live: mode === "dictado",
    }),
  );

  const recording = recorder.state !== "idle" || dictation.active;
  const error = recorder.error || dictation.error || notice;

  async function start() {
    setNotice(null);
    if (mode === "dictado") {
      if (!dictation.start(speechLang)) return;
      // La grabación en paralelo guarda el audio en el archivo; si falla, el dictado sigue.
      await recorder.start();
    } else {
      await recorder.start();
    }
  }

  function stop() {
    dictation.stop();
    recorder.stop();
  }

  function togglePause() {
    if (mode === "dictado") {
      if (recorder.state === "recording") dictation.stop();
      else dictation.start(speechLang);
    }
    recorder.togglePause();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD) {
      setNotice("El archivo supera 4 MB. Usa un audio más corto o comprimido.");
      return;
    }
    setNotice(null);
    const durationProbe = new Audio(URL.createObjectURL(file));
    durationProbe.onloadedmetadata = () => {
      URL.revokeObjectURL(durationProbe.src);
      const d = Number.isFinite(durationProbe.duration) ? durationProbe.duration : 0;
      props.onAudio(file, { durationSec: d, source: "archivo", name: file.name, live: false });
    };
    durationProbe.onerror = () => props.onAudio(file, { durationSec: 0, source: "archivo", name: file.name, live: false });
  }

  const statusText = recording
    ? recorder.state === "paused"
      ? "En pausa"
      : mode === "dictado"
        ? "Dictando…"
        : "Escuchando la consulta…"
    : busy === "transcribing"
      ? "Transcribiendo audio…"
      : "Listo para grabar";

  return (
    <section className="card flex flex-col p-6" aria-labelledby="capture-title">
      <h2 id="capture-title" className="flex items-center gap-2.5 text-base font-semibold">
        <Icon name="mic" size={19} className="text-primary" /> Captura de Audio
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Modo de captura">
        {(
          [
            ["ambiental", "Escucha Ambiental"],
            ["dictado", "Dictado Directo"],
          ] as const
        ).map(([value, label]) => {
          const selected = mode === value;
          const disabled = readOnly || recording || (value === "dictado" && speechSupported === false);
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => props.onModeChange(value)}
              title={value === "dictado" && speechSupported === false ? "Tu navegador no admite dictado en vivo" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                selected ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink disabled:opacity-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-ink-faint">
        {mode === "ambiental"
          ? "Graba la conversación con el paciente; se transcribe con IA al detener."
          : "Dicta en voz alta: el texto aparece en vivo mientras hablas."}
      </p>

      <div className="flex flex-col items-center gap-3 py-7">
        {recording ? (
          <button
            type="button"
            onClick={stop}
            className={`flex h-20 w-20 items-center justify-center rounded-full bg-rec text-white shadow-lg ${
              recorder.state === "paused" ? "" : "recording-pulse"
            }`}
            aria-label="Detener grabación"
          >
            <span className="h-6 w-6 rounded-md bg-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={readOnly || Boolean(busy)}
            className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary-line bg-primary-soft text-primary transition hover:scale-105 hover:border-primary disabled:opacity-40 disabled:hover:scale-100"
            aria-label="Iniciar grabación"
          >
            {busy === "transcribing" ? <Spinner /> : <Icon name="mic" size={30} />}
          </button>
        )}

        <p className="text-sm text-ink-soft" aria-live="polite">
          {recording && <span className="mr-2 font-mono tabular-nums text-ink">{formatDuration(recorder.seconds)}</span>}
          {statusText}
        </p>

        {recording && (
          <div className="flex w-full max-w-60 items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="h-full rounded-full bg-primary transition-[width] duration-75" style={{ width: `${Math.round(recorder.level * 100)}%` }} />
            </div>
            {recorder.state !== "idle" && (
              <button type="button" className="text-xs font-medium text-ink-soft hover:text-ink" onClick={togglePause}>
                {recorder.state === "paused" ? "Reanudar" : "Pausa"}
              </button>
            )}
          </div>
        )}

        {!recording && !readOnly && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
            <button type="button" className="font-medium text-primary hover:underline disabled:opacity-50" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
              Subir archivo de audio
            </button>
            <span className="text-ink-faint">·</span>
            <button type="button" className="font-medium text-primary hover:underline disabled:opacity-50" onClick={props.onLoadSample} disabled={Boolean(busy)}>
              Usar consulta de ejemplo
            </button>
            <input ref={fileRef} type="file" accept="audio/*,video/webm" className="hidden" onChange={onFile} />
          </div>
        )}
      </div>

      {audios.length > 0 && (
        <div className="mb-5 space-y-2">
          <p className="label">Audios de esta consulta ({audios.length})</p>
          {audios.map((a, i) => (
            <AudioChip key={a.id} id={a.id} durationSec={a.durationSec} label={`${a.name} ${audios.length - i}`} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <label htmlFor="transcript" className="text-sm font-medium">
          Transcripción (editable)
        </label>
        {speechSupported !== null && (
          <span className={`badge ${speechSupported ? "bg-success-soft text-success" : "bg-surface-2 text-ink-faint"}`}>
            {speechSupported ? "Voz soportada" : "Dictado no disponible"}
          </span>
        )}
      </div>
      <textarea
        id="transcript"
        className="input mt-2 min-h-48 resize-y leading-relaxed"
        value={report.transcript}
        readOnly={readOnly}
        onChange={(e) => props.onTranscriptChange(e.target.value)}
        placeholder="El texto dictado aparecerá aquí. También puedes escribir manualmente..."
      />
      {dictation.interim && <p className="mt-1.5 text-sm italic text-ink-faint">{dictation.interim}…</p>}

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          <Icon name="alert" size={16} className="mt-0.5" /> {error}
        </p>
      )}

      {!readOnly && (
        <button
          type="button"
          className="btn btn-navy mt-5 w-full py-3 text-base"
          onClick={props.onProcess}
          disabled={Boolean(busy) || recording || report.transcript.trim().length < 20}
        >
          {busy === "structuring" ? (
            <>
              <Spinner /> Procesando…
            </>
          ) : (
            <>
              <Icon name="sparkles" size={18} /> Procesar con IA
            </>
          )}
        </button>
      )}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { audioDb } from "@/lib/client/audio-db";
import { formatDuration } from "@/lib/reports/helpers";
import { Icon } from "../ui/Icon";

/** Carga un audio de IndexedDB como object URL y lo libera al desmontar. */
export function useAudioUrl(id: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    audioDb
      .get(id)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setMissing(true);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return { url, missing };
}

/** Botón compacto de reproducción con barra de progreso. */
export function AudioChip({ id, durationSec, label }: { id: string; durationSec: number; label: string }) {
  const { url, missing } = useAudioUrl(id);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink disabled:opacity-40"
        aria-label={playing ? "Pausar audio" : "Reproducir audio"}
      >
        <Icon name={playing ? "pause" : "play"} size={13} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate font-medium text-ink">{label}</span>
          <span className="shrink-0 tabular-nums text-ink-faint">{missing ? "no disponible" : formatDuration(durationSec)}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            const total = Number.isFinite(el.duration) ? el.duration : durationSec;
            setProgress(total ? Math.min(1, el.currentTime / total) : 0);
          }}
        />
      )}
    </div>
  );
}

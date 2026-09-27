"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_RECORDING_SECONDS = 20 * 60;
const BITRATE = 24_000; // voz: ~180 KB/min con Opus → 20 min ≈ 3.6 MB (< límite de 4 MB)

function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

export type RecorderState = "idle" | "recording" | "paused";

/** Grabación con MediaRecorder, medidor de nivel y límite de duración. */
export function useRecorder(onComplete: (blob: Blob, durationSec: number) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const secondsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const id = window.setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_RECORDING_SECONDS) recorderRef.current?.stop();
    }, 1000);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(
    () => () => {
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      cleanup();
    },
    [cleanup],
  );

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: BITRATE });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        cleanup();
        setState("idle");
        if (blob.size > 0) onCompleteRef.current(blob, secondsRef.current);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      secondsRef.current = 0;
      setSeconds(0);
      setState("recording");

      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      ctxRef.current = ctx;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 64));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      return true;
    } catch (e) {
      cleanup();
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Permiso de micrófono denegado. Actívalo en la configuración del navegador."
          : "No se pudo acceder al micrófono.",
      );
      return false;
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }, []);

  const togglePause = useCallback(() => {
    const r = recorderRef.current;
    if (r?.state === "recording") {
      r.pause();
      setState("paused");
    } else if (r?.state === "paused") {
      r.resume();
      setState("recording");
    }
  }, []);

  return { state, seconds, level, error, start, stop, togglePause };
}

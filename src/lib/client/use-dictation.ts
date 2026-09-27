"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictado en vivo con la Web Speech API del navegador (Chrome, Edge, Safari).
 * El texto aparece mientras el médico habla, sin coste de API.
 */

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useSpeechSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la detección solo es posible en el cliente
    setSupported(Boolean(getCtor()));
  }, []);
  return supported;
}

export function useDictation(onFinal: (text: string) => void) {
  const [active, setActive] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantedRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  const start = useCallback((lang: string) => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Este navegador no admite dictado en vivo. Usa Chrome o Edge, o la escucha ambiental.");
      return false;
    }
    setError(null);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        if (!text) continue;
        if (r.isFinal) onFinalRef.current(text);
        else pending += `${text} `;
      }
      setInterim(pending.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      wantedRef.current = false;
      setError(
        e.error === "not-allowed"
          ? "Permiso de micrófono denegado para el dictado."
          : `El reconocimiento de voz se detuvo (${e.error}).`,
      );
    };
    // Chrome corta el reconocimiento tras un silencio: se reanuda mientras siga activo.
    rec.onend = () => {
      if (recRef.current !== rec) return; // una instancia anterior (tras pausa/reanudar)
      if (wantedRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* se detiene abajo */
        }
      }
      setActive(false);
      setInterim("");
    };
    recRef.current?.stop();
    recRef.current = rec;
    wantedRef.current = true;
    try {
      rec.start();
    } catch {
      setError("No se pudo iniciar el reconocimiento de voz.");
      return false;
    }
    setActive(true);
    return true;
  }, []);

  const stop = useCallback(() => {
    wantedRef.current = false;
    recRef.current?.stop();
  }, []);

  useEffect(
    () => () => {
      wantedRef.current = false;
      recRef.current?.stop();
    },
    [],
  );

  return { active, interim, error, start, stop };
}

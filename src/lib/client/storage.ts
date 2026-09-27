"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Estado persistido en localStorage. Todo el historial y las plantillas
 * personalizadas viven solo en el navegador del médico: el servidor no guarda
 * datos clínicos.
 */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratar desde storage tras montar evita desajustes SSR
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      /* storage no disponible o corrupto: se usa el valor inicial */
    }
    setLoaded(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* cuota excedida o modo privado */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, loaded] as const;
}

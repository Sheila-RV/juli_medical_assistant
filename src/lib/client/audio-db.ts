"use client";

/**
 * Almacén de audios en IndexedDB (localStorage no admite binarios ni tamaños grandes).
 * Los audios nunca salen del navegador salvo para transcribirse.
 */
const DB_NAME = "mediscribe";
const STORE = "audios";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const audioDb = {
  put: (id: string, blob: Blob) => run("readwrite", (s) => s.put(blob, id)),
  get: (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id)),
  delete: (id: string) => run("readwrite", (s) => s.delete(id)),
  clear: () => run("readwrite", (s) => s.clear()),
};

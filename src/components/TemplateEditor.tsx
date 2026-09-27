"use client";

import { useState } from "react";
import { TemplateSchema, type Template, type TemplateField } from "@/lib/templates/types";

/** "Tensión arterial" → "tension_arterial" */
export function slugifyKey(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  return /^[a-z]/.test(base) ? base : `campo_${base}`.slice(0, 40);
}

interface DraftField {
  label: string;
  hint: string;
  type: "text" | "list";
  section: string;
}

function toDraft(field: TemplateField): DraftField {
  return { label: field.label, hint: field.hint ?? "", type: field.type ?? "text", section: field.section ?? "" };
}

interface Props {
  initial?: Template;
  onSave: (template: Template) => void;
  onCancel: () => void;
}

export function TemplateEditor({ initial, onSave, onCancel }: Props) {
  const isEdit = Boolean(initial && !initial.builtIn);
  const [name, setName] = useState(initial ? (initial.builtIn ? `${initial.name} (personalizada)` : initial.name) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "General");
  const [fields, setFields] = useState<DraftField[]>(
    initial?.fields.map(toDraft) ?? [{ label: "", hint: "", type: "text", section: "" }],
  );
  const [error, setError] = useState<string | null>(null);

  function updateField(i: number, patch: Partial<DraftField>) {
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  }

  function move(i: number, dir: -1 | 1) {
    setFields((fs) => {
      const j = i + dir;
      if (j < 0 || j >= fs.length) return fs;
      const next = [...fs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    const used = new Set<string>();
    const builtFields = fields
      .filter((f) => f.label.trim())
      .map((f) => {
        let key = slugifyKey(f.label);
        for (let n = 2; used.has(key); n++) key = `${slugifyKey(f.label).slice(0, 36)}_${n}`;
        used.add(key);
        return {
          key,
          label: f.label.trim(),
          hint: f.hint.trim(),
          type: f.type,
          section: f.section.trim() || undefined,
        };
      });

    const candidate = {
      id: isEdit && initial ? initial.id : `custom-${Date.now().toString(36)}`,
      name: name.trim(),
      description: description.trim(),
      specialty: specialty.trim() || "General",
      fields: builtFields,
    };
    const result = TemplateSchema.safeParse(candidate);
    if (!result.success) {
      const issue = result.error.issues[0];
      setError(
        issue.path[0] === "name"
          ? "La plantilla necesita un nombre."
          : issue.path[0] === "fields"
            ? "Añade al menos un campo con nombre (máx. 40)."
            : issue.message,
      );
      return;
    }
    onSave(result.data);
  }

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="border-b border-line px-6 py-4">
        <h2 className="font-display text-2xl">{isEdit ? "Editar plantilla" : "Nueva plantilla"}</h2>
        <p className="text-sm text-ink-soft">
          Cada campo se convierte en una instrucción para la IA. La descripción le dice qué información debe ir ahí.
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="sm:col-span-2">
            <span className="label">Nombre</span>
            <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Consulta de control prenatal" />
          </label>
          <label>
            <span className="label">Especialidad</span>
            <input className="input mt-1" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </label>
          <label className="sm:col-span-3">
            <span className="label">Descripción</span>
            <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para qué se usa esta plantilla" />
          </label>
        </div>

        <div>
          <span className="label">Campos ({fields.length})</span>
          <ol className="mt-2 space-y-3">
            {fields.map((f, i) => (
              <li key={i} className="rounded-xl border border-line bg-paper p-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    className="input min-w-40 flex-1"
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Nombre del campo (p. ej. Semanas de gestación)"
                    aria-label={`Nombre del campo ${i + 1}`}
                  />
                  <select
                    className="input w-auto"
                    value={f.type}
                    onChange={(e) => updateField(i, { type: e.target.value as DraftField["type"] })}
                    aria-label="Tipo"
                  >
                    <option value="text">Texto</option>
                    <option value="list">Lista</option>
                  </select>
                  <input
                    className="input w-36"
                    value={f.section}
                    onChange={(e) => updateField(i, { section: e.target.value })}
                    placeholder="Sección (opcional)"
                    aria-label="Sección"
                  />
                  <div className="flex gap-1">
                    <button type="button" className="btn btn-ghost px-2" onClick={() => move(i, -1)} aria-label="Subir">↑</button>
                    <button type="button" className="btn btn-ghost px-2" onClick={() => move(i, 1)} aria-label="Bajar">↓</button>
                    <button
                      type="button"
                      className="btn btn-ghost px-2 text-danger"
                      onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                      aria-label="Eliminar campo"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <input
                  className="input mt-2"
                  value={f.hint}
                  onChange={(e) => updateField(i, { hint: e.target.value })}
                  placeholder="Instrucción para la IA: qué información va aquí"
                  aria-label="Instrucción para la IA"
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="btn btn-ghost mt-3"
            onClick={() => setFields((fs) => [...fs, { label: "", hint: "", type: "text", section: "" }])}
            disabled={fields.length >= 40}
          >
            + Añadir campo
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
        {error && <p className="mr-auto text-sm text-danger">{error}</p>}
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={save}>Guardar plantilla</button>
      </div>
    </div>
  );
}

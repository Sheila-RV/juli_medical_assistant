"use client";

import { isEmptyValue, noteHasContent } from "@/lib/reports/helpers";
import type { Report } from "@/lib/reports/types";
import type { StructuredNote, Template, TemplateField } from "@/lib/templates/types";
import { Icon } from "../ui/Icon";
import { Spinner } from "./CapturePanel";

/** Colores por sección SOAP; el resto usa el color neutro. */
const SECTION_STYLE: Record<string, string> = {
  S: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  O: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  A: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  P: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
};

/** "S · Subjetivo" → { letter: "S", title: "Subjetivo" }; "Antecedentes" → { letter: "A", title: "Antecedentes" } */
function parseSection(section: string) {
  const [head, ...rest] = section.split("·").map((s) => s.trim());
  if (rest.length && head.length <= 2) return { letter: head, title: rest.join(" · "), soap: true };
  return { letter: section.trim()[0]?.toUpperCase() ?? "•", title: section.trim(), soap: false };
}

function groupFields(fields: TemplateField[]) {
  const groups: { section?: string; fields: TemplateField[] }[] = [];
  for (const f of fields) {
    const last = groups.at(-1);
    if (last && last.section === f.section) last.fields.push(f);
    else groups.push({ section: f.section, fields: [f] });
  }
  return groups;
}

interface Props {
  report: Report;
  templates: Template[];
  busy?: "transcribing" | "structuring";
  onTemplateChange: (t: Template) => void;
  onNoteChange: (note: StructuredNote) => void;
  onDiscard: () => void;
  onApprove: () => void;
  onReopen: () => void;
  onExport: () => void;
}

export function NotePanel({ report, templates, busy, onTemplateChange, onNoteChange, onDiscard, onApprove, onReopen, onExport }: Props) {
  const { note, template } = report;
  const approved = report.status === "aprobado";
  const hasContent = noteHasContent(note);
  const filled = template.fields.filter((f) => !isEmptyValue(note.fields[f.key])).length;

  const badge = approved
    ? { text: "Aprobado", cls: "bg-success-soft text-success" }
    : report.generationMode === "demo"
      ? { text: "Borrador IA · demo", cls: "bg-warn-soft text-warn" }
      : report.generatedAt
        ? { text: "Borrador IA", cls: "bg-primary-soft text-primary" }
        : { text: "Sin procesar", cls: "bg-surface-2 text-ink-faint" };

  function setField(field: TemplateField, raw: string) {
    const value = field.type === "list" ? raw.split("\n").map((l) => l.replace(/^\s*[-•]\s*/, "")) : raw;
    onNoteChange({ ...note, fields: { ...note.fields, [field.key]: value } });
  }

  function normalize(field: TemplateField) {
    const v = note.fields[field.key];
    if (Array.isArray(v)) onNoteChange({ ...note, fields: { ...note.fields, [field.key]: v.map((x) => x.trim()).filter(Boolean) } });
  }

  function pickTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t || t.id === template.id) return;
    if (hasContent && !confirm("Cambiar de plantilla vacía la nota actual. Podrás volver a procesarla con IA. ¿Continuar?")) return;
    onTemplateChange(t);
  }

  return (
    <section className="card print-area flex flex-col" aria-labelledby="note-title">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-5">
        <Icon name="file" size={20} className="text-primary" />
        <h2 id="note-title" className="text-lg font-semibold">
          Nota Estructurada
        </h2>
        <div className="no-print relative">
          <select
            value={template.id}
            onChange={(e) => pickTemplate(e.target.value)}
            disabled={approved || Boolean(busy)}
            aria-label="Plantilla"
            className="appearance-none rounded-lg border border-line bg-surface-2 py-1.5 pl-3 pr-8 text-sm font-medium text-ink focus:border-primary focus:outline-none disabled:opacity-70"
          >
            {!templates.some((t) => t.id === template.id) && <option value={template.id}>{template.name}</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        </div>
        <span className="hidden font-semibold print:inline">({template.name})</span>
        <span className={`badge ml-auto ${badge.cls}`}>{badge.text}</span>
      </header>

      {busy === "structuring" && (
        <div className="no-print flex items-center gap-2 border-b border-line bg-primary-soft px-6 py-3 text-sm text-primary">
          <Spinner /> La IA está rellenando la plantilla con la transcripción…
        </div>
      )}

      {note.warnings.length > 0 && (
        <div className="border-b border-line bg-warn-soft px-6 py-4" role="note" aria-label="Puntos a verificar">
          <p className="flex items-center gap-2 text-sm font-semibold text-warn">
            <Icon name="alert" size={16} /> Revisar antes de firmar
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-9 text-sm text-ink">
            {note.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 space-y-6 px-6 py-5">
        {groupFields(template.fields).map((group, gi) => {
          const sec = group.section ? parseSection(group.section) : null;
          const single = group.fields.length === 1 && sec;
          return (
            <div key={gi} className="space-y-3">
              {sec && (
                <h3 className="flex items-center gap-3 text-sm font-semibold">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                      SECTION_STYLE[sec.letter] ?? "bg-surface-2 text-ink-soft"
                    }`}
                  >
                    {sec.letter}
                  </span>
                  {sec.title}
                </h3>
              )}
              {group.fields.map((field) => {
                const value = note.fields[field.key];
                const empty = isEmptyValue(value);
                return (
                  <div key={field.key}>
                    {!single && (
                      <label htmlFor={`f-${field.key}`} className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-soft">
                        {field.label}
                        {empty && report.generatedAt && (
                          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-normal text-ink-faint">no referido</span>
                        )}
                      </label>
                    )}
                    <textarea
                      id={`f-${field.key}`}
                      aria-label={single ? field.label : undefined}
                      className="input min-h-20 resize-y leading-relaxed [field-sizing:content]"
                      value={Array.isArray(value) ? value.join("\n") : (value ?? "")}
                      readOnly={approved}
                      onChange={(e) => setField(field, e.target.value)}
                      onBlur={() => field.type === "list" && normalize(field)}
                      placeholder={`${field.hint || field.label}${field.type === "list" ? " (uno por línea)" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <footer className="no-print flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
        <p className="mr-auto text-xs text-ink-faint">
          {approved && report.approvedAt
            ? `Aprobado el ${new Date(report.approvedAt).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}`
            : `${filled}/${template.fields.length} campos con información`}
        </p>
        {approved ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={onReopen}>
              <Icon name="undo" size={16} /> Reabrir edición
            </button>
            <button type="button" className="btn btn-primary" onClick={onExport}>
              <Icon name="send" size={16} /> Exportar a EHR
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={onDiscard} disabled={Boolean(busy)}>
              Descartar
            </button>
            <button type="button" className="btn btn-primary" onClick={onApprove} disabled={!hasContent || Boolean(busy)}>
              <Icon name="send" size={16} /> Aprobar y Exportar a EHR
            </button>
          </>
        )}
      </footer>
      <p className="hidden px-6 pb-4 text-xs print:block">
        Borrador generado con IA y revisado por el profesional responsable.
      </p>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import type { Template } from "@/lib/templates/types";
import { TemplateEditor } from "../TemplateEditor";
import { Icon } from "../ui/Icon";
import { PageHeader } from "./PageHeader";

export function TemplatesView() {
  const router = useRouter();
  const { templates, profile, setProfile, saveTemplate, deleteTemplate, createReport, reports } = useApp();
  const [editing, setEditing] = useState<{ initial?: Template } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (editing) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [editing]);

  function remove(t: Template) {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"? Los informes ya creados con ella no cambian.`)) return;
    deleteTemplate(t.id);
    if (profile.defaultTemplateId === t.id) setProfile({ ...profile, defaultTemplateId: "soap-breve" });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Plantillas" description="Formatos de nota que la IA rellena. Duplica una incluida o crea la tuya.">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> Nueva plantilla
        </button>
      </PageHeader>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const isDefault = profile.defaultTemplateId === t.id;
          const sections = [...new Set(t.fields.map((f) => f.section?.split("·").pop()?.trim()).filter(Boolean))];
          const uses = reports.filter((r) => r.template.id === t.id && (r.transcript || r.generatedAt)).length;
          return (
            <li key={t.id} className={`card flex flex-col p-5 ${isDefault ? "ring-2 ring-primary/40" : ""}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{t.name}</h2>
                  <p className="text-xs text-ink-faint">
                    {t.specialty} · {t.fields.length} campos{uses ? ` · ${uses} informe${uses > 1 ? "s" : ""}` : ""}
                  </p>
                </div>
                {t.builtIn ? (
                  <span className="badge bg-surface-2 text-ink-soft">Incluida</span>
                ) : (
                  <span className="badge bg-primary-soft text-primary">Propia</span>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{t.description || "Sin descripción."}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(sections.length ? sections : t.fields.slice(0, 4).map((f) => f.label)).slice(0, 6).map((s) => (
                  <span key={s} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-soft">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <button type="button" className="btn btn-primary px-3 py-1.5 text-xs" onClick={() => router.push(`/?id=${createReport(t.id)}`)}>
                  Usar en consulta
                </button>
                <button type="button" className="btn btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditing({ initial: t })}>
                  {t.builtIn ? "Duplicar" : "Editar"}
                </button>
                {!t.builtIn && (
                  <button type="button" className="btn btn-danger px-3 py-1.5 text-xs" onClick={() => remove(t)}>
                    Eliminar
                  </button>
                )}
                <button
                  type="button"
                  className={`ml-auto text-xs font-medium ${isDefault ? "text-primary" : "text-ink-faint hover:text-ink"}`}
                  onClick={() => setProfile({ ...profile, defaultTemplateId: t.id })}
                  disabled={isDefault}
                >
                  {isDefault ? "★ Predeterminada" : "☆ Predeterminar"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setEditing(null)}
        className="m-auto w-[min(760px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
      >
        {editing && (
          <TemplateEditor
            initial={editing.initial}
            onSave={(t) => {
              saveTemplate(t);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </dialog>
    </div>
  );
}

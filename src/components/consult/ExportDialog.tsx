"use client";

import { useEffect, useRef, useState } from "react";
import { toFhirBundle } from "@/lib/export/fhir";
import { patientDisplayName, patientSummary } from "@/lib/reports/helpers";
import type { Report } from "@/lib/reports/types";
import { noteToMarkdown, noteToPlainText } from "@/lib/templates/schema";
import { Icon, type IconName } from "../ui/Icon";

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function header(report: Report, author: string) {
  return [
    `Paciente: ${patientDisplayName(report.patient)}${patientSummary(report.patient) ? ` (${patientSummary(report.patient)})` : ""}`,
    `Consulta: ${report.consultationType} · ${new Date(report.createdAt).toLocaleString("es", { dateStyle: "long", timeStyle: "short" })}`,
    author && `Profesional: ${author}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function ExportDialog({ report, author, onClose }: { report: Report; author: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const slug = `${report.template.id}-${(report.patient.name || "paciente").toLowerCase().replace(/\s+/g, "-")}-${report.createdAt.slice(0, 10)}`;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  type Action = "fhir" | "copy" | "print" | "md";

  async function run(action: Action) {
    if (action === "fhir") {
      download(`${slug}.fhir.json`, JSON.stringify(toFhirBundle(report, author), null, 2), "application/fhir+json");
    } else if (action === "copy") {
      await navigator.clipboard.writeText(`${header(report, author)}\n\n${noteToPlainText(report.template, report.note)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else if (action === "print") {
      ref.current?.close();
      setTimeout(() => window.print(), 50);
    } else {
      const md = `${header(report, author).replace(/^/gm, "> ")}\n\n${noteToMarkdown(report.template, report.note)}`;
      download(`${slug}.md`, md, "text/markdown;charset=utf-8");
    }
  }

  const options: { id: Action; icon: IconName; title: string; detail: string }[] = [
    {
      id: "fhir",
      icon: "code",
      title: "Documento FHIR R4 (.json)",
      detail: "Bundle con Composition + Patient, importable en expedientes compatibles con HL7 FHIR.",
    },
    {
      id: "copy",
      icon: "copy",
      title: copied ? "¡Copiado al portapapeles!" : "Copiar como texto",
      detail: "Para pegar directamente en el campo de notas de tu EHR.",
    },
    { id: "print", icon: "printer", title: "Imprimir / guardar PDF", detail: "Versión limpia de la nota para firmar o archivar." },
    { id: "md", icon: "download", title: "Markdown (.md)", detail: "Texto con formato, legible en cualquier editor." },
  ];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
    >
      <div className="flex items-start gap-3 border-b border-line px-6 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
          <Icon name="check" size={20} />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Informe aprobado</h2>
          <p className="text-sm text-ink-soft">
            {patientDisplayName(report.patient)} · {report.template.name}
          </p>
        </div>
        <button type="button" className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2" onClick={() => ref.current?.close()} aria-label="Cerrar">
          <Icon name="x" size={18} />
        </button>
      </div>
      <ul className="space-y-2 p-4">
        {options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => run(o.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-line px-4 py-3 text-left transition hover:border-primary hover:bg-primary-soft/50"
            >
              <Icon name={o.icon} size={18} className="mt-0.5 text-primary" />
              <span>
                <span className="block text-sm font-medium">{o.title}</span>
                <span className="block text-xs text-ink-soft">{o.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="px-6 pb-5 text-xs text-ink-faint">
        La integración directa con un EHR (envío por API FHIR) está en el roadmap; por ahora se exporta el documento.
      </p>
    </dialog>
  );
}

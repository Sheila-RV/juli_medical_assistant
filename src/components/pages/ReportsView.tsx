"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/client/store";
import {
  formatDuration,
  isBlankReport,
  patientDisplayName,
  patientSummary,
  primaryDiagnosis,
  reportSearchText,
} from "@/lib/reports/helpers";
import type { Report } from "@/lib/reports/types";
import { Icon } from "../ui/Icon";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "./PageHeader";

type StatusFilter = "todos" | "borrador" | "aprobado";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
}

export function ReportsView() {
  const router = useRouter();
  const { loaded, reports, audios, templates, createReport, deleteReport } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [templateId, setTemplateId] = useState("");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const visible = useMemo(() => reports.filter((r) => !isBlankReport(r)), [reports]);
  const filtered = useMemo(() => {
    const q = query.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    return visible
      .filter((r) => status === "todos" || r.status === status)
      .filter((r) => !templateId || r.template.id === templateId)
      .filter((r) => !q || reportSearchText(r).includes(q))
      .sort((a, b) => (order === "desc" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  }, [visible, query, status, templateId, order]);

  const drafts = visible.filter((r) => r.status === "borrador").length;
  const totalAudioSec = audios.reduce((s, a) => s + a.durationSec, 0);

  function open(r: Report) {
    router.push(`/?id=${r.id}`);
  }

  async function remove(r: Report) {
    if (!confirm(`¿Eliminar el informe de ${patientDisplayName(r.patient)} y sus audios? No se puede deshacer.`)) return;
    await deleteReport(r.id);
  }

  const templateOptions = templates.filter((t) => visible.some((r) => r.template.id === t.id));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Informes" description="Todas las consultas documentadas en este navegador.">
        <button type="button" className="btn btn-primary" onClick={() => router.push(`/?id=${createReport()}`)}>
          <Icon name="plus" size={16} /> Nueva consulta
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Informes" value={visible.length} />
        <StatCard label="Borradores" value={drafts} tone="warn" hint="pendientes de aprobar" />
        <StatCard label="Aprobados" value={visible.length - drafts} tone="success" />
        <StatCard label="Audios" value={audios.length} tone="primary" hint={`${formatDuration(totalAudioSec)} grabados`} />
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-56 flex-1">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input pl-9"
            placeholder="Buscar por paciente, ID o diagnóstico…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar informes"
          />
        </div>
        <div className="flex rounded-lg bg-surface-2 p-1 text-sm" role="group" aria-label="Filtrar por estado">
          {(["todos", "borrador", "aprobado"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1.5 font-medium capitalize ${status === s ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              {s === "todos" ? "Todos" : s === "borrador" ? "Borradores" : "Aprobados"}
            </button>
          ))}
        </div>
        <select className="input w-auto" value={templateId} onChange={(e) => setTemplateId(e.target.value)} aria-label="Filtrar por plantilla">
          <option value="">Todas las plantillas</option>
          {templateOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={order} onChange={(e) => setOrder(e.target.value as "desc" | "asc")} aria-label="Orden">
          <option value="desc">Más recientes</option>
          <option value="asc">Más antiguos</option>
        </select>
      </div>

      {!loaded ? (
        <div className="card h-64 animate-pulse" />
      ) : visible.length === 0 ? (
        <EmptyState title="Aún no hay informes">
          Inicia una <Link href="/" className="font-medium text-primary hover:underline">nueva consulta</Link>: graba o dicta, procesa con IA y
          el informe aparecerá aquí.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin resultados">Prueba con otra búsqueda o quita los filtros.</EmptyState>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Consulta</th>
                  <th className="px-4 py-3 font-medium">Diagnóstico</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 text-center font-medium">Audios</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-surface-2/70" onClick={() => open(r)}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{patientDisplayName(r.patient)}</p>
                      <p className="text-xs text-ink-faint">{patientSummary(r.patient) || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p>{r.consultationType}</p>
                      <p className="text-xs text-ink-faint">{r.template.name}</p>
                    </td>
                    <td className="max-w-56 px-4 py-3.5">
                      <p className="truncate text-ink-soft">{primaryDiagnosis(r) || "—"}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-ink-soft">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3.5 text-center">
                      {r.audioIds.length ? (
                        <span className="inline-flex items-center gap-1 text-ink-soft">
                          <Icon name="wave" size={14} /> {r.audioIds.length}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="rounded-lg p-2 text-ink-faint hover:bg-danger-soft hover:text-danger" onClick={() => remove(r)} aria-label="Eliminar informe">
                          <Icon name="trash" size={16} />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-primary-soft hover:text-primary" onClick={() => open(r)} aria-label="Abrir informe">
                          <Icon name="arrowRight" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <li key={r.id} className="card p-4">
                <button type="button" className="w-full text-left" onClick={() => open(r)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{patientDisplayName(r.patient)}</p>
                      <p className="text-xs text-ink-faint">
                        {r.consultationType} · {r.template.name}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {primaryDiagnosis(r) && <p className="mt-2 truncate text-sm text-ink-soft">{primaryDiagnosis(r)}</p>}
                  <p className="mt-2 flex items-center gap-3 text-xs text-ink-faint">
                    <span>{fmtDate(r.createdAt)}</span>
                    {r.audioIds.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="wave" size={12} /> {r.audioIds.length}
                      </span>
                    )}
                  </p>
                </button>
                <div className="mt-3 flex justify-end border-t border-line pt-3">
                  <button type="button" className="text-xs font-medium text-danger" onClick={() => remove(r)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

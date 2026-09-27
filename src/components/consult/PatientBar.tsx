"use client";

import { useState } from "react";
import { patientDisplayName, patientHasData, patientSummary } from "@/lib/reports/helpers";
import { CONSULTATION_TYPES, SEX_OPTIONS, type Patient } from "@/lib/reports/types";
import { Icon } from "../ui/Icon";

interface Props {
  patient: Patient;
  consultationType: string;
  readOnly: boolean;
  onChange: (patch: { patient?: Patient; consultationType?: string }) => void;
}

export function PatientBar({ patient, consultationType, readOnly, onChange }: Props) {
  const [editing, setEditing] = useState(!patientHasData(patient) && !readOnly);
  const [draft, setDraft] = useState(patient);
  const summary = patientSummary(patient);

  function save() {
    onChange({ patient: { ...draft, name: draft.name.trim(), age: draft.age.trim(), externalId: draft.externalId.trim() } });
    setEditing(false);
  }

  return (
    <div className="no-print border-b border-primary-line/60 bg-primary-soft/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3.5 sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-line bg-surface text-primary">
          <Icon name="user" size={18} />
        </span>

        {editing ? (
          <form
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              className="input min-w-48 flex-1 bg-surface py-2"
              placeholder="Nombre del paciente"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              aria-label="Nombre del paciente"
              autoFocus
            />
            <select
              className="input w-24 bg-surface py-2"
              value={draft.sex}
              onChange={(e) => setDraft({ ...draft, sex: e.target.value as Patient["sex"] })}
              aria-label="Sexo"
            >
              {SEX_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s || "Sexo"}
                </option>
              ))}
            </select>
            <input
              className="input w-20 bg-surface py-2"
              placeholder="Edad"
              inputMode="numeric"
              value={draft.age}
              onChange={(e) => setDraft({ ...draft, age: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })}
              aria-label="Edad"
            />
            <input
              className="input w-32 bg-surface py-2"
              placeholder="ID / Expediente"
              value={draft.externalId}
              onChange={(e) => setDraft({ ...draft, externalId: e.target.value })}
              aria-label="ID del paciente"
            />
            <button type="submit" className="btn btn-primary py-2">
              <Icon name="check" size={15} /> Guardar
            </button>
            {patientHasData(patient) && (
              <button type="button" className="btn btn-ghost py-2" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            )}
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={`truncate font-semibold ${patient.name ? "text-ink" : "text-ink-soft"}`}>{patientDisplayName(patient)}</p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(patient);
                    setEditing(true);
                  }}
                  className="rounded p-1 text-ink-faint hover:bg-surface hover:text-primary"
                  aria-label="Editar datos del paciente"
                >
                  <Icon name="pencil" size={14} />
                </button>
              )}
            </div>
            <p className="text-xs text-ink-soft">{summary || "Sin datos demográficos"}</p>
          </div>
        )}

        <div className="relative">
          <select
            value={consultationType}
            disabled={readOnly}
            onChange={(e) => onChange({ consultationType: e.target.value })}
            aria-label="Tipo de consulta"
            className="appearance-none rounded-full border border-primary-line bg-surface py-1.5 pl-4 pr-9 text-sm font-medium text-primary focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:opacity-80"
          >
            {CONSULTATION_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-primary" />
        </div>
      </div>
    </div>
  );
}

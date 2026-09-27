"use client";

import { useState } from "react";
import { useApp } from "@/lib/client/store";
import { Icon } from "../ui/Icon";
import { PageHeader } from "./PageHeader";

const DICTATION_LANGS = [
  ["es-ES", "Español (España)"],
  ["es-MX", "Español (México)"],
  ["es-AR", "Español (Argentina)"],
  ["es-CO", "Español (Colombia)"],
  ["es-CL", "Español (Chile)"],
  ["es-PE", "Español (Perú)"],
  ["es-US", "Español (EE. UU.)"],
] as const;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card grid gap-5 p-6 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ProfileForm() {
  const app = useApp();
  const [profile, setProfileDraft] = useState(app.profile);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(profile) !== JSON.stringify(app.profile);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    app.setProfile({ ...profile, name: profile.name.trim(), specialty: profile.specialty.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <form onSubmit={saveProfile}>
        <Section title="Perfil" description="Aparece en la cabecera y como autor de los informes exportados.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Nombre</span>
              <input className="input mt-1" placeholder="Dr. Martínez" value={profile.name} onChange={(e) => setProfileDraft({ ...profile, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Especialidad</span>
              <input className="input mt-1" placeholder="Cardiología" value={profile.specialty} onChange={(e) => setProfileDraft({ ...profile, specialty: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Idioma del dictado en vivo</span>
              <select className="input mt-1" value={profile.dictationLang} onChange={(e) => setProfileDraft({ ...profile, dictationLang: e.target.value })}>
                {DICTATION_LANGS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Plantilla predeterminada</span>
              <select className="input mt-1" value={profile.defaultTemplateId} onChange={(e) => setProfileDraft({ ...profile, defaultTemplateId: e.target.value })}>
                {app.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={!dirty}>
              Guardar perfil
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-success">
                <Icon name="check" size={16} /> Guardado
              </span>
            )}
          </div>
        </Section>
    </form>
  );
}

export function SettingsView() {
  const app = useApp();

  function exportBackup() {
    const data = { exportedAt: new Date().toISOString(), reports: app.reports, audios: app.audios, templates: app.customTemplates };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `juli-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function wipe() {
    if (!confirm("Se borrarán todos los informes, audios y plantillas propias de este navegador. ¿Continuar?")) return;
    await app.resetAll();
  }

  const s = app.status;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Ajustes" description="Perfil, dictado, acceso a la IA y datos locales." />

      {/* Se vuelve a montar al cargar el perfil guardado */}
      <ProfileForm key={JSON.stringify(app.profile)} />

      <Section title="Servicio de IA" description="Estado de la instancia desplegada.">
        {s ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-surface-2 p-3">
              <dt className="text-xs text-ink-faint">Transcripción</dt>
              <dd className={`font-medium ${s.transcribe === "live" ? "text-success" : "text-warn"}`}>{s.transcribe === "live" ? "Activa" : "Demo"}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <dt className="text-xs text-ink-faint">Estructuración</dt>
              <dd className={`font-medium ${s.structure === "live" ? "text-success" : "text-warn"}`}>{s.structure === "live" ? "Activa" : "Demo"}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <dt className="text-xs text-ink-faint">Modelo</dt>
              <dd className="truncate font-medium">{s.model}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ink-faint">No se pudo consultar el estado del servidor.</p>
        )}
        {s?.accessCodeRequired && (
          <label className="block">
            <span className="label">Código de acceso</span>
            <input
              type="password"
              className="input mt-1 max-w-xs"
              placeholder="Introduce el código"
              value={app.accessCode}
              onChange={(e) => app.setAccessCode(e.target.value)}
            />
            <span className="mt-1 block text-xs text-ink-faint">Sin código válido, las respuestas son de demostración.</span>
          </label>
        )}
        {s?.structure === "demo" && !s.accessCodeRequired && (
          <p className="text-sm text-ink-soft">
            Para activar la IA real define <code className="rounded bg-surface-2 px-1">OPENAI_API_KEY</code> en el servidor (ver README).
          </p>
        )}
      </Section>

      <Section title="Datos locales" description="Todo se guarda solo en este navegador; el servidor no almacena nada.">
        <p className="text-sm text-ink-soft">
          {app.reports.length} informes · {app.audios.length} audios · {app.customTemplates.length} plantillas propias
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={exportBackup}>
            <Icon name="download" size={16} /> Exportar copia (JSON)
          </button>
          <button type="button" className="btn btn-danger" onClick={wipe}>
            <Icon name="trash" size={16} /> Borrar todos los datos
          </button>
        </div>
      </Section>
    </div>
  );
}

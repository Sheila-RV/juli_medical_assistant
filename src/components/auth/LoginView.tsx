"use client";

import { useState } from "react";
import { Icon } from "../ui/Icon";

interface DemoAccount {
  email: string;
  password: string;
  name: string;
  specialty: string;
}

const FEATURES = [
  "Escucha ambiental o dictado en vivo",
  "Notas SOAP y plantillas propias rellenadas con IA",
  "Gestión de informes y audios",
  "Exportación a EHR en FHIR R4",
];

export function LoginView({ next, demoAccounts }: { next: string; demoAccounts: DemoAccount[] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo iniciar sesión.");
        setLoading(false);
        return;
      }
      // Recarga completa: el layout del servidor lee la nueva cookie de sesión.
      window.location.assign(next);
    } catch {
      setError("Sin conexión con el servidor.");
      setLoading(false);
    }
  }

  function fillAccount(a: DemoAccount) {
    setEmail(a.email);
    setPassword(a.password);
    setError(null);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5">
          <Icon name="stethoscope" size={28} />
          <span className="text-xl font-bold tracking-tight">Juli</span>
        </div>
        <div className="my-auto max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Documenta la consulta mientras atiendes al paciente.</h1>
          <p className="mt-4 text-blue-100">
            Graba o dicta; la IA convierte la conversación en la nota clínica de tu plantilla, lista para revisar y firmar.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-blue-50">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                  <Icon name="check" size={14} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-blue-200">Prototipo de portafolio · No es un dispositivo médico.</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" aria-hidden />
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-primary lg:hidden">
            <Icon name="stethoscope" size={26} />
            <span className="text-lg font-bold tracking-tight">Juli</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-ink-soft">Accede con tu cuenta profesional.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="label">Correo electrónico</span>
              <input
                type="email"
                autoComplete="username"
                required
                className="input mt-1.5"
                placeholder="doctor@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Contraseña</span>
              <div className="relative mt-1.5">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="input pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-faint hover:text-ink"
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Icon name={show ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
            </label>

            {error && (
              <p role="alert" className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                <Icon name="alert" size={16} /> {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          {demoAccounts.length > 0 && (
            <section className="mt-8 rounded-2xl border border-dashed border-primary-line bg-primary-soft/50 p-4" aria-labelledby="demo-title">
              <p id="demo-title" className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Icon name="shield" size={16} /> Cuentas de demostración
              </p>
              <p className="mt-1 text-xs text-ink-soft">Credenciales públicas para probar la app. Cada cuenta tiene sus propios informes.</p>
              <ul className="mt-3 space-y-2">
                {demoAccounts.map((a) => (
                  <li key={a.email} className="flex items-center gap-3 rounded-xl bg-surface p-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {a.name} <span className="font-normal text-ink-faint">· {a.specialty}</span>
                      </p>
                      <p className="truncate font-mono text-ink-soft">{a.email}</p>
                      <p className="font-mono text-ink-soft">{a.password}</p>
                    </div>
                    <button type="button" className="btn btn-ghost shrink-0 px-3 py-1.5 text-xs" onClick={() => fillAccount(a)}>
                      Usar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

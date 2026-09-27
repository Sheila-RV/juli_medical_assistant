"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { isBlankReport, patientDisplayName } from "@/lib/reports/helpers";
import { Icon, type IconName } from "../ui/Icon";

const NAV: { href: string; label: string; icon: IconName; count?: "reports" | "audios" | "templates" }[] = [
  { href: "/", label: "Consulta", icon: "mic" },
  { href: "/informes", label: "Informes", icon: "folder", count: "reports" },
  { href: "/audios", label: "Audios", icon: "wave", count: "audios" },
  { href: "/plantillas", label: "Plantillas", icon: "template", count: "templates" },
  { href: "/ajustes", label: "Ajustes", icon: "settings" },
];

const TITLES: Record<string, string> = {
  "/": "Consulta",
  "/informes": "Gestión de informes",
  "/audios": "Audios",
  "/plantillas": "Plantillas",
  "/ajustes": "Ajustes",
};

function Brand() {
  return (
    <Link href="/informes" className="flex items-center gap-2 text-primary">
      <Icon name="stethoscope" size={24} />
      <span className="text-lg font-bold tracking-tight">Juli</span>
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { reports, audios, templates, activeId, createReport, status } = useApp();
  const visible = reports.filter((r) => !isBlankReport(r));
  const counts = { reports: visible.length, audios: audios.length, templates: templates.length };
  const recent = visible.slice(0, 5);
  const consultHref = activeId && reports.some((r) => r.id === activeId) ? `/?id=${activeId}` : "/";
  const isDemo = status?.structure === "demo";

  function newConsult() {
    const id = createReport();
    router.push(`/?id=${id}`);
    onNavigate?.();
  }

  return (
    <nav className="flex h-full flex-col gap-6 px-4 py-5" aria-label="Menú principal">
      <div className="px-2">
        <Brand />
      </div>

      <button type="button" className="btn btn-primary w-full" onClick={newConsult}>
        <Icon name="plus" size={16} /> Nueva consulta
      </button>

      <ul className="space-y-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const href = item.href === "/" ? consultHref : item.href;
          return (
            <li key={item.href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon name={item.icon} size={18} />
                <span className="flex-1">{item.label}</span>
                {item.count && counts[item.count] > 0 && (
                  <span className={`rounded-full px-2 text-xs ${active ? "bg-surface text-primary" : "bg-surface-2 text-ink-faint"}`}>
                    {counts[item.count]}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {recent.length > 0 && (
        <div className="min-h-0 flex-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">Recientes</p>
          <ul className="mt-2 space-y-0.5">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/?id=${r.id}`}
                  onClick={onNavigate}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${r.status === "aprobado" ? "bg-success" : "bg-warn"}`}
                    title={r.status === "aprobado" ? "Aprobado" : "Borrador"}
                  />
                  <span className="truncate">{patientDisplayName(r.patient)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto rounded-xl border border-line bg-surface-2 p-3 text-xs">
        {status ? (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isDemo ? "bg-warn" : "bg-success"}`} />
            <span className="font-medium text-ink">{isDemo ? "Modo demo" : "IA activa"}</span>
            <span className="ml-auto truncate text-ink-faint">{isDemo ? "sin claves" : status.model}</span>
          </div>
        ) : (
          <span className="text-ink-faint">Comprobando servicio…</span>
        )}
        <p className="mt-1.5 flex items-center gap-1.5 text-ink-faint">
          <Icon name="lock" size={12} /> Datos guardados solo en este navegador
        </p>
      </div>
    </nav>
  );
}

function UserMenu() {
  const { profile, user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = profile.name || user?.name || "";
  const specialty = profile.specialty || user?.specialty || "";
  const initial = (name.replace(/^(dr|dra)\.?\s*/i, "").trim()[0] ?? "M").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-surface-2"
      >
        <span className="hidden text-right text-sm text-ink-soft sm:block">
          {name}
          {specialty && ` - ${specialty}`}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">{initial}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-ink-faint">{user?.email}</p>
          </div>
          <Link
            href="/ajustes"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="settings" size={16} /> Perfil y ajustes
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-soft"
          >
            <Icon name="logout" size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
      <button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-surface-2 lg:hidden" onClick={onMenu} aria-label="Abrir menú">
        <Icon name="menu" size={20} />
      </button>
      <div className="lg:hidden">
        <Brand />
      </div>
      <p className="hidden text-base font-semibold lg:block">{TITLES[pathname] ?? ""}</p>
      <UserMenu />
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el menú móvil al cambiar de página
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen">
      <aside className="no-print hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: string | number; hint?: string; tone?: "default" | "warn" | "success" | "primary" }) {
  const toneCls = { default: "text-ink", warn: "text-warn", success: "text-success", primary: "text-primary" }[tone];
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</p>
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <p className="text-base font-semibold">{title}</p>
      <div className="mt-1 max-w-md text-sm text-ink-soft">{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "borrador" | "aprobado" }) {
  return status === "aprobado" ? (
    <span className="badge bg-success-soft text-success">Aprobado</span>
  ) : (
    <span className="badge bg-warn-soft text-warn">Borrador</span>
  );
}

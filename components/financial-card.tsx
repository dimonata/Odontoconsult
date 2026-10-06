import type { LucideIcon } from "lucide-react";

export function FinancialCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "danger" | "neutral";
}) {
  const colors = {
    primary: "var(--primary)",
    success: "var(--success)",
    danger: "var(--danger)",
    neutral: "var(--muted)",
  };
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {helper && (
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {helper}
            </p>
          )}
        </div>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `color-mix(in srgb, ${colors[tone]} 12%, transparent)`,
            color: colors[tone],
          }}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

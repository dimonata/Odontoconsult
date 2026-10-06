import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed px-5 py-12 text-center">
      <span
        className="mx-auto flex size-12 items-center justify-center rounded-2xl"
        style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
      >
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{ color: "var(--muted)" }}>
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link className="btn-primary mt-5" href={actionHref}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

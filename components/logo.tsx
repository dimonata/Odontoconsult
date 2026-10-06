import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-3" aria-label="OdontoFlow">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: "linear-gradient(145deg, var(--primary), #48aeb3)" }}
      >
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          Odonto<span style={{ color: "var(--primary)" }}>Flow</span>
        </span>
      )}
    </Link>
  );
}

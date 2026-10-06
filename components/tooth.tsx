"use client";

export function Tooth({
  number,
  selected,
  hasHistory,
  onClick,
}: {
  number: number;
  selected: boolean;
  hasHistory?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Dente ${number}${hasHistory ? ", possui procedimentos" : ""}`}
      className="group flex min-w-9 flex-col items-center gap-1 rounded-lg p-1 transition focus-visible:ring-2"
      style={selected ? { background: "var(--primary-soft)", color: "var(--primary)" } : undefined}
    >
      <svg viewBox="0 0 40 52" className="h-11 w-8 overflow-visible" aria-hidden="true">
        <path
          d="M7 6C10 1 16 2 20 4c4-2 10-3 13 2 4 7 0 16-2 22-1 4-1 17-6 18-4 0-2-13-5-13s-1 13-5 13c-5-1-5-14-6-18C7 22 3 13 7 6Z"
          fill={selected ? "var(--primary)" : hasHistory ? "var(--primary-soft)" : "var(--surface)"}
          stroke={selected || hasHistory ? "var(--primary)" : "var(--muted)"}
          strokeWidth="1.7"
          className="transition"
        />
        <path
          d="M10 12c6 3 14 3 20 0M20 4v11"
          fill="none"
          stroke={selected ? "white" : "var(--border)"}
          strokeWidth="1.2"
        />
      </svg>
      <span className="text-[11px] font-semibold">{number}</span>
    </button>
  );
}

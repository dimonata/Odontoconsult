export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Carregando">
      <div className="h-9 w-56 rounded-lg" style={{ background: "var(--surface-muted)" }} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl"
            style={{ background: "var(--surface-muted)" }}
          />
        ))}
      </div>
      <div className="h-80 rounded-2xl" style={{ background: "var(--surface-muted)" }} />
    </div>
  );
}

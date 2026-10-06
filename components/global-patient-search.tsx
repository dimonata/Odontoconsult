"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Search, UserRound } from "lucide-react";

type SearchPatient = { id: string; fullName: string; cpf: string; phone: string };

export function GlobalPatientSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as { items?: SearchPatient[] };
        if (id === requestId.current) {
          setItems(data.items ?? []);
          setOpen(true);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="absolute top-1/2 left-4 size-5 -translate-y-1/2"
          style={{ color: "var(--muted)" }}
        />
        <input
          className="input h-13 pl-12 pr-12 text-base"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (value.trim().length < 2) {
              setItems([]);
              setOpen(false);
            }
          }}
          onFocus={() => items.length && setOpen(true)}
          placeholder="Pesquisar paciente por nome, CPF ou telefone..."
          aria-label="Pesquisar paciente por nome, CPF ou telefone"
          autoComplete="off"
        />
        {loading && (
          <LoaderCircle
            className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin"
            style={{ color: "var(--primary)" }}
          />
        )}
      </div>
      {open && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 left-0 z-30 overflow-hidden rounded-xl border shadow-xl"
          style={{ background: "var(--surface)" }}
        >
          {items.length ? (
            items.map((patient) => (
              <Link
                key={patient.id}
                href={`/pacientes/${patient.id}`}
                className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                <span
                  className="flex size-9 items-center justify-center rounded-full"
                  style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                >
                  <UserRound className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{patient.fullName}</span>
                  <span className="block truncate text-xs" style={{ color: "var(--muted)" }}>
                    {patient.cpf} · {patient.phone}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>
              Nenhum paciente encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

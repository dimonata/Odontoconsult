"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto mt-16 max-w-lg text-center">
      <AlertTriangle className="mx-auto size-10" style={{ color: "var(--danger)" }} />
      <h1 className="mt-4 text-xl font-bold">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Tente novamente. Se o problema continuar, verifique a conexão com o banco de dados.
      </p>
      <button className="btn-primary mt-6" onClick={reset}>
        <RefreshCcw className="size-4" />
        Tentar novamente
      </button>
    </div>
  );
}

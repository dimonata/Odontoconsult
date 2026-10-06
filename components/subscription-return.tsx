"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";

export function SubscriptionReturn({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "active" | "pending" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/billing/sync", { method: "POST" })
      .then(async (response) => {
        const data = (await response.json()) as { active?: boolean };
        if (!response.ok) throw new Error();
        if (cancelled) return;
        if (data.active) {
          setState("active");
          window.setTimeout(() => router.replace(returnTo), 1_200);
        } else setState("pending");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [returnTo, router]);

  return (
    <div className="card mx-auto max-w-lg text-center">
      {state === "loading" && <LoaderCircle className="mx-auto size-10 animate-spin" />}
      {state === "active" && <CheckCircle2 className="mx-auto size-10 text-green-600" />}
      {(state === "pending" || state === "error") && (
        <TriangleAlert className="mx-auto size-10 text-amber-600" />
      )}
      <h1 className="mt-4 text-2xl font-bold">
        {state === "loading"
          ? "Confirmando assinatura..."
          : state === "active"
            ? "Assinatura ativada"
            : state === "pending"
              ? "Pagamento ainda pendente"
              : "Não foi possível confirmar agora"}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {state === "active"
          ? "Seu primeiro mês gratuito começou. Você será redirecionado."
          : "Se você concluiu o checkout, aguarde alguns segundos e atualize esta página."}
      </p>
      {state !== "loading" && state !== "active" && (
        <div className="mt-5 flex justify-center gap-3">
          <button className="btn-primary" type="button" onClick={() => window.location.reload()}>
            Verificar novamente
          </button>
          <Link className="btn-secondary" href={returnTo}>
            Voltar
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

export function SubscriptionButton({
  returnPath,
  label = "Assinar com Mercado Pago",
  className = "btn-primary",
}: {
  returnPath: "/servicos/novo" | "/configuracoes";
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  async function checkout() {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath }),
      });
      const data = (await response.json()) as {
        active?: boolean;
        checkoutUrl?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível abrir o pagamento.");
      if (data.active) {
        window.location.reload();
        return;
      }
      if (!data.checkoutUrl) throw new Error("O Mercado Pago não retornou o checkout.");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o pagamento.");
      setLoading(false);
    }
  }
  return (
    <button type="button" className={className} onClick={() => void checkout()} disabled={loading}>
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <CreditCard className="size-4" />
      )}
      {loading ? "Abrindo Mercado Pago..." : label}
    </button>
  );
}

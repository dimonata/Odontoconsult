"use client";

import { useState } from "react";
import { Gift, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LifetimeCouponForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function redeem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/billing/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { active?: boolean; error?: string };
      if (!response.ok || !data.active) {
        throw new Error(data.error ?? "Não foi possível aplicar o cupom.");
      }
      toast.success("Acesso vitalício ativado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar o cupom.");
      setLoading(false);
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={redeem}>
      <input
        className="input min-w-0 flex-1 uppercase"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Cupom vitalício"
        autoComplete="off"
        maxLength={100}
        required
        disabled={loading}
        aria-label="Cupom vitalício"
      />
      <button className="btn-secondary shrink-0" type="submit" disabled={loading}>
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Gift className="size-4" />}
        {loading ? "Aplicando..." : "Aplicar cupom"}
      </button>
    </form>
  );
}

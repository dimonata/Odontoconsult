import { CheckCircle2, LockKeyhole } from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { SubscriptionButton } from "@/components/subscription-button";

export function SubscriptionCard({
  active,
  amountCents,
  trialEndsAt,
}: {
  active: boolean;
  amountCents: number | null;
  trialEndsAt: string | null;
}) {
  return (
    <section className="card">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
        >
          {active ? <CheckCircle2 className="size-5" /> : <LockKeyhole className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Plano OdontoFlow</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {active
              ? trialEndsAt
                ? `Assinatura ativa. Primeiro pagamento em ${new Intl.DateTimeFormat("pt-BR").format(new Date(trialEndsAt))}.`
                : "Assinatura ativa."
              : `Um mês grátis e depois ${amountCents ? `${formatCurrency(amountCents)} por mês` : "o valor mensal configurado"}.`}
          </p>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--muted)" }}>
            Inclui registro de serviços, Google Calendar e confirmações automáticas de consultas.
          </p>
        </div>
      </div>
      {!active && (
        <div className="mt-5">
          <SubscriptionButton returnPath="/configuracoes" />
        </div>
      )}
    </section>
  );
}

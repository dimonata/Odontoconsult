"use client";

import { useState } from "react";
import { MessageCircle, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function WhatsAppMessageSettings({
  canEdit,
  initialBirthdaysEnabled,
  initialMonthlyAppointments,
  eligiblePatients,
  utilityRate,
  marketingRate,
}: {
  canEdit: boolean;
  initialBirthdaysEnabled: boolean;
  initialMonthlyAppointments: number;
  eligiblePatients: number;
  utilityRate: number;
  marketingRate: number;
}) {
  const [birthdaysEnabled, setBirthdaysEnabled] = useState(initialBirthdaysEnabled);
  const [monthlyAppointments, setMonthlyAppointments] = useState(initialMonthlyAppointments);
  const [saving, setSaving] = useState(false);
  const confirmationsCost = monthlyAppointments * utilityRate;
  const monthlyBirthdays = eligiblePatients / 12;
  const birthdaysCost = birthdaysEnabled ? monthlyBirthdays * marketingRate : 0;

  async function changeBirthdays(enabled: boolean) {
    setSaving(true);
    try {
      const response = await fetch("/api/clinic/birthday-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      setBirthdaysEnabled(enabled);
      toast.success(enabled ? "Mensagens de aniversário ativadas." : "Mensagens de aniversário desativadas.");
    } catch {
      toast.error("Não foi possível salvar esta preferência.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
          <MessageCircle className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Mensagens pelo WhatsApp Business</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Veja uma previsão de gasto antes de conectar seu número.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border p-4">
        <p className="text-sm font-semibold">Confirmação de consulta</p>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Uma mensagem por consulta, somente para pacientes que autorizaram o WhatsApp.
        </p>
        <label className="mt-4 block">
          <span className="label">Consultas previstas por mês</span>
          <input
            className="input max-w-48"
            type="number"
            min="0"
            max="100000"
            step="1"
            value={monthlyAppointments}
            onChange={(event) => {
              const value = Number(event.target.value);
              setMonthlyAppointments(Number.isFinite(value) ? Math.max(0, Math.min(100000, Math.floor(value))) : 0);
            }}
          />
        </label>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Sugestão inicial: média de consultas dos últimos 90 dias com pacientes que autorizaram mensagens.
        </p>
      </div>

      <div className="mt-4 rounded-xl border p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={birthdaysEnabled}
            disabled={!canEdit || saving}
            onChange={(event) => void changeBirthdays(event.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold">Enviar mensagem de feliz aniversário (opcional)</span>
            <span className="mt-1 block text-sm" style={{ color: "var(--muted)" }}>
              Desativado por padrão. Hoje há {eligiblePatients} paciente(s) ativo(s) com autorização para WhatsApp; média aproximada de {monthlyBirthdays.toFixed(1).replace(".", ",")} aniversários por mês.
            </span>
          </span>
          {saving && <LoaderCircle className="size-4 animate-spin" />}
        </label>
        {!canEdit && <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Somente o proprietário pode alterar esta opção.</p>}
      </div>

      <div className="mt-4 rounded-xl p-4" style={{ background: "var(--primary-soft)" }}>
        <p className="text-sm font-semibold">Previsão mensal da Meta</p>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-3"><span>Confirmações ({money.format(utilityRate)} por mensagem)</span><span>{money.format(confirmationsCost)}</span></div>
          <div className="flex justify-between gap-3"><span>Aniversários ({money.format(marketingRate)} por mensagem)</span><span>{money.format(birthdaysCost)}</span></div>
          <div className="flex justify-between gap-3 border-t pt-2 font-bold"><span>Total estimado</span><span>{money.format(confirmationsCost + birthdaysCost)}</span></div>
        </div>
        <p className="mt-3 text-xs leading-5" style={{ color: "var(--muted)" }}>
          Tarifas de referência de outubro de 2026 para números brasileiros, com uma mensagem entregue por consulta e por aniversário. A Meta define a categoria dos modelos e pode alterar tarifas. Confira os preços atuais antes de ativar; a assinatura do OdontoFlow é cobrada separadamente.
        </p>
        <a className="mt-2 inline-block text-xs underline" href="https://whatsappbusiness.com/pt-br/products/platform-pricing/" target="_blank" rel="noopener noreferrer">Consultar preços oficiais da Meta</a>
      </div>
      <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
        A conexão de um número próprio por consultório depende da configuração do aplicativo na Meta. Se já houver uma integração global configurada, ativar aniversários passa a permitir esses envios.
      </p>
      <button className="btn-primary mt-3" type="button" disabled title="Aguardando configuração do aplicativo na Meta">
        Conectar WhatsApp Business
      </button>
    </section>
  );
}

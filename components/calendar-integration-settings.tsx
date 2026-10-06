"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Link2, LoaderCircle, Unlink } from "lucide-react";
import { toast } from "sonner";
import { SubscriptionButton } from "@/components/subscription-button";

type CalendarOption = { id: string; summary: string; primary?: boolean };

export function CalendarIntegrationSettings({ premium }: { premium: boolean }) {
  const [loading, setLoading] = useState(premium);
  const [connected, setConnected] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [selected, setSelected] = useState("");
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);

  useEffect(() => {
    if (!premium) {
      return;
    }
    void fetch("/api/integrations/google-calendar")
      .then((response) => response.json())
      .then(
        (data: {
          connected: boolean;
          needsReconnect?: boolean;
          selectedCalendarId?: string;
          calendars?: CalendarOption[];
        }) => {
          setConnected(data.connected);
          setNeedsReconnect(Boolean(data.needsReconnect));
          setSelected(data.selectedCalendarId ?? "");
          setCalendars(data.calendars ?? []);
        },
      )
      .finally(() => setLoading(false));
  }, [premium]);

  async function selectCalendar(calendarId: string) {
    setSelected(calendarId);
    const item = calendars.find((calendar) => calendar.id === calendarId);
    const response = await fetch("/api/integrations/google-calendar", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ calendarId, calendarName: item?.summary ?? calendarId }),
    });
    if (response.ok) toast.success("Calendário de sincronização atualizado.");
    else toast.error("Não foi possível selecionar o calendário.");
  }

  async function disconnect() {
    if (!window.confirm("Desconectar o Google Calendar? As consultas locais serão mantidas."))
      return;
    const response = await fetch("/api/integrations/google-calendar", { method: "DELETE" });
    if (response.ok) {
      setConnected(false);
      setCalendars([]);
      toast.success("Google Calendar desconectado.");
    }
  }

  return (
    <section className="card">
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 items-center justify-center rounded-xl"
          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
        >
          <CalendarDays className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Google Calendar</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Autorização separada e acesso mínimo à agenda.
          </p>
        </div>
      </div>
      {!premium ? (
        <div className="mt-5 rounded-xl border p-4">
          <p className="text-sm font-semibold">Recurso disponível no plano mensal</p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Assine para conectar e sincronizar sua agenda. O primeiro mês é gratuito.
          </p>
          <div className="mt-4">
            <SubscriptionButton returnPath="/configuracoes" label="Liberar Google Calendar" />
          </div>
        </div>
      ) : loading ? (
        <LoaderCircle className="mt-5 size-5 animate-spin" />
      ) : !connected || needsReconnect ? (
        <div className="mt-5">
          {needsReconnect && (
            <p className="mb-3 text-sm" style={{ color: "var(--danger)" }}>
              A autorização expirou ou foi revogada.
            </p>
          )}
          <a href="/api/integrations/google-calendar/connect" className="btn-primary">
            <Link2 className="size-4" />{" "}
            {needsReconnect ? "Reconectar" : "Conectar Google Calendar"}
          </a>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="googleCalendar">
              Calendário para sincronização
            </label>
            <select
              id="googleCalendar"
              className="input"
              value={selected}
              onChange={(event) => void selectCalendar(event.target.value)}
            >
              {calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                  {calendar.primary ? " (principal)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => void disconnect()}
            style={{ color: "var(--danger)" }}
          >
            <Unlink className="size-4" /> Desconectar
          </button>
        </div>
      )}
      <p className="mt-4 text-xs leading-5" style={{ color: "var(--muted)" }}>
        Apenas horário, primeiro nome e um título genérico são enviados. Observações clínicas, CPF e
        telefone permanecem somente no sistema.
      </p>
    </section>
  );
}

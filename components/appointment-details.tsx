"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, History, LoaderCircle, RefreshCw, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { AppointmentStatusBadge } from "@/components/appointment-status-badge";
import type { AppointmentStatusKey } from "@/lib/appointment-ui";

function LinkPatient({ appointmentId, onLinked }: { appointmentId: string; onLinked: () => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Array<{ id: string; fullName: string; phone: string }>>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (query.trim().length < 2) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) throw new Error("SEARCH_FAILED");
      const data = (await response.json()) as { items?: typeof items };
      setItems(data.items ?? []);
    } catch {
      toast.error("Não foi possível pesquisar pacientes.");
    } finally {
      setLoading(false);
    }
  }

  async function link(patientId: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Não foi possível vincular a ficha.");
      }
      toast.success("Ficha vinculada à consulta.");
      onLinked();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível vincular a ficha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2 className="flex items-center gap-2 font-semibold"><UserRoundPlus className="size-5" /> Vincular ficha de paciente</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Quando a ficha estiver pronta, pesquise o paciente e vincule-a a esta consulta.</p>
      <div className="mt-4 flex gap-2">
        <input className="input" value={query} onChange={(event) => { setQuery(event.target.value); setItems([]); }} placeholder="Nome, CPF ou telefone" aria-label="Pesquisar paciente" />
        <button type="button" className="btn-secondary" disabled={loading || query.trim().length < 2} onClick={() => void search()}>{loading ? "Buscando..." : "Buscar"}</button>
      </div>
      {items.length > 0 && <div className="mt-3 divide-y rounded-xl border">{items.map((item) => <button key={item.id} type="button" disabled={loading} onClick={() => void link(item.id)} className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm"><span>{item.fullName} · {item.phone}</span><span className="font-semibold" style={{ color: "var(--primary)" }}>Vincular</span></button>)}</div>}
      <Link href="/pacientes/novo" className="mt-3 inline-block text-sm font-semibold" style={{ color: "var(--primary)" }}>Cadastrar nova ficha</Link>
    </section>
  );
}

export function AppointmentDetails({
  appointment,
}: {
  appointment: {
    id: string;
    status: AppointmentStatusKey;
    calendarSyncStatus: string;
    calendarSyncError: string | null;
    date: string;
    startTime: string;
    durationMinutes: number;
    notes: string | null;
    patient: { id: string; fullName: string; phone: string } | null;
    guestName: string | null;
    guestPhone: string | null;
    dentist: { name: string | null };
    appointmentType: { name: string; color: string };
    timezone: string;
    history: Array<{
      id: string;
      action: string;
      previousStartAt: string | null;
      newStartAt: string | null;
      previousStatus: AppointmentStatusKey | null;
      newStatus: AppointmentStatusKey | null;
      createdAt: string;
      changedBy: { name: string | null };
    }>;
  };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const actionLabels: Record<string, string> = {
    APPOINTMENT_CREATED: "Consulta criada",
    APPOINTMENT_UPDATED: "Consulta atualizada",
    APPOINTMENT_RESCHEDULED: "Consulta remarcada",
    APPOINTMENT_CANCELLED: "Consulta cancelada",
    APPOINTMENT_CONFIRMED: "Consulta confirmada",
  };
  const formatMoment = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: appointment.timezone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));

  async function patch(payload: Record<string, unknown>, success: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        appointment?: { calendarSyncStatus: string };
      };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar.");
      toast.success(success);
      if (data.appointment?.calendarSyncStatus === "FAILED") {
        toast.warning("Alteração salva, mas a sincronização com o Google falhou.");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function retrySync() {
    setSaving(true);
    const response = await fetch(`/api/appointments/${appointment.id}/retry-sync`, {
      method: "POST",
    });
    const data = (await response.json()) as {
      appointment?: { calendarSyncStatus: string };
      error?: string;
    };
    if (data.appointment?.calendarSyncStatus === "SYNCED")
      toast.success("Google Calendar sincronizado.");
    else toast.error(data.error ?? "Ainda não foi possível sincronizar.");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AppointmentStatusBadge status={appointment.status} />
              <span
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  background: "var(--surface-muted)",
                  color: appointment.appointmentType.color,
                }}
              >
                {appointment.appointmentType.name}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              {appointment.patient?.fullName ?? appointment.guestName ?? "Pessoa sem ficha"}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              {appointment.date.split("-").reverse().join("/")} · {appointment.startTime} ·{" "}
              {appointment.durationMinutes} minutos
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Dentista: {appointment.dentist.name ?? "Profissional"} · {appointment.patient?.phone ?? appointment.guestPhone}
            </p>
            {!appointment.patient && <p className="mt-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>Consulta sem ficha de paciente</p>}
          </div>
          {appointment.patient && <Link href={`/pacientes/${appointment.patient.id}`} className="btn-secondary">Ver paciente</Link>}
        </div>
        {appointment.notes && (
          <div
            className="mt-5 rounded-xl p-4 text-sm"
            style={{ background: "var(--surface-muted)" }}
          >
            <p className="text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
              Observações internas
            </p>
            <p className="mt-2 whitespace-pre-wrap">{appointment.notes}</p>
          </div>
        )}
      </section>

      {!appointment.patient && <LinkPatient appointmentId={appointment.id} onLinked={() => router.refresh()} />}

      {appointment.calendarSyncStatus === "FAILED" && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">
            Consulta salva, mas não foi possível sincronizar com Google Calendar.
          </p>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() => void retrySync()}
            disabled={saving}
          >
            <RefreshCw className="size-4" /> Tentar sincronizar novamente
          </button>
        </section>
      )}
      {appointment.calendarSyncStatus === "NOT_CONNECTED" && (
        <section className="card p-4 text-sm">
          Google Calendar não conectado.{" "}
          <Link href="/configuracoes" className="font-semibold" style={{ color: "var(--primary)" }}>
            Conectar agora
          </Link>
        </section>
      )}

      <section className="card">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5" style={{ color: "var(--primary)" }} />
          <h2 className="font-semibold">Remarcar consulta</h2>
        </div>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void patch(
              {
                date: form.get("date"),
                startTime: form.get("startTime"),
                durationMinutes: Number(form.get("durationMinutes")),
              },
              "Consulta remarcada.",
            );
          }}
        >
          <input
            className="input"
            name="date"
            type="date"
            required
            defaultValue={appointment.date}
          />
          <input
            className="input"
            name="startTime"
            type="time"
            required
            defaultValue={appointment.startTime}
          />
          <input
            className="input"
            name="durationMinutes"
            type="number"
            min={10}
            max={720}
            required
            defaultValue={appointment.durationMinutes}
          />
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : "Remarcar"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="font-semibold">Atualizar status</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {appointment.status !== "CONFIRMED" && appointment.status !== "CANCELLED" && (
            <button
              className="btn-secondary"
              type="button"
              disabled={saving}
              onClick={() => void patch({ status: "CONFIRMED" }, "Consulta confirmada.")}
            >
              Confirmar
            </button>
          )}
          {appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED" && (
            <button
              className="btn-secondary"
              type="button"
              disabled={saving}
              onClick={() => void patch({ status: "COMPLETED" }, "Consulta concluída.")}
            >
              Concluir
            </button>
          )}
          {appointment.status !== "NO_SHOW" && appointment.status !== "CANCELLED" && (
            <button
              className="btn-secondary"
              type="button"
              disabled={saving}
              onClick={() => void patch({ status: "NO_SHOW" }, "Não comparecimento registrado.")}
            >
              Não compareceu
            </button>
          )}
          {appointment.status !== "CANCELLED" && (
            <button
              className="btn-secondary"
              style={{ color: "var(--danger)" }}
              type="button"
              disabled={saving}
              onClick={() => {
                if (window.confirm("Cancelar esta consulta? O histórico será preservado."))
                  void patch(
                    { status: "CANCELLED", cancellationSource: "DENTIST" },
                    "Consulta cancelada.",
                  );
              }}
            >
              Cancelar consulta
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <div className="flex items-center gap-2">
          <History className="size-5" style={{ color: "var(--primary)" }} />
          <h2 className="font-semibold">Histórico da consulta</h2>
        </div>
        <div className="mt-4 divide-y">
          {appointment.history.map((item) => {
            const timeChanged =
              item.previousStartAt && item.newStartAt && item.previousStartAt !== item.newStartAt;
            const statusChanged =
              item.previousStatus && item.newStatus && item.previousStatus !== item.newStatus;
            return (
              <article key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col justify-between gap-1 sm:flex-row">
                  <p className="text-sm font-semibold">
                    {actionLabels[item.action] ?? "Consulta atualizada"}
                  </p>
                  <time className="text-xs" style={{ color: "var(--muted)" }}>
                    {formatMoment(item.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                  Por {item.changedBy.name ?? "sistema"}
                </p>
                {timeChanged && (
                  <p className="mt-2 text-sm">
                    {formatMoment(item.previousStartAt!)} → {formatMoment(item.newStartAt!)}
                  </p>
                )}
                {statusChanged && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <AppointmentStatusBadge status={item.previousStatus!} />
                    <span aria-hidden>→</span>
                    <AppointmentStatusBadge status={item.newStatus!} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

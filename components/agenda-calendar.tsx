"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppointmentStatusBadge } from "@/components/appointment-status-badge";
import { appointmentStatus, type AppointmentStatusKey } from "@/lib/appointment-ui";

export type AgendaAppointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatusKey;
  cancellationSource: "PATIENT" | "DENTIST" | "SYSTEM" | null;
  patient: { id: string; fullName: string };
  dentist: { id: string; name: string | null };
  appointmentType: { id: string; name: string; color: string };
};

function dateKey(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function time(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function add(date: string, amount: number, unit: "day" | "month") {
  const result = new Date(`${date}T12:00:00.000Z`);
  if (unit === "month") {
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + amount);
  } else result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

const scheduleHeight = "calc(100svh - 20rem)";

function formatMinute(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function minutesOfDay(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date(value))
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function isHourOccupied(items: AgendaAppointment[], hour: number, timeZone: string) {
  const start = hour * 60;
  const end = start + 60;
  return items.some((item) => {
    if (item.status === "CANCELLED") return false;
    const itemStart = minutesOfDay(item.startAt, timeZone);
    const itemEnd = minutesOfDay(item.endAt, timeZone);
    return itemStart < end && itemEnd > start;
  });
}

function ScheduleAppointment({
  item,
  timeZone,
  workdayStartMinute,
  workdayEndMinute,
  compact = false,
}: {
  item: AgendaAppointment;
  timeZone: string;
  workdayStartMinute: number;
  workdayEndMinute: number;
  compact?: boolean;
}) {
  const start = minutesOfDay(item.startAt, timeZone);
  const end = Math.max(start + 10, minutesOfDay(item.endAt, timeZone));
  const visibleStart = Math.max(start, workdayStartMinute);
  const visibleEnd = Math.min(end, workdayEndMinute);
  if (visibleStart >= visibleEnd) return null;
  const duration = Math.max(10, end - start);
  const visibleMinutes = workdayEndMinute - workdayStartMinute;
  const top = `${((visibleStart - workdayStartMinute) / visibleMinutes) * 100}%`;
  const height = `${((visibleEnd - visibleStart) / visibleMinutes) * 100}%`;
  const status = appointmentStatus[item.status];
  return (
    <Link
      href={`/agenda/${item.id}`}
      title={`${item.patient.fullName} — ${status.label}`}
      className={`absolute right-1 left-1 z-10 overflow-hidden rounded-md border-l-4 p-2 shadow-sm transition hover:brightness-95 ${item.status === "CANCELLED" ? "opacity-55" : ""}`}
      style={{
        top,
        height,
        borderLeftColor: item.appointmentType.color,
        background: "var(--surface)",
      }}
    >
      <p className="truncate text-[11px] font-bold">
        {time(item.startAt, timeZone)} · {item.patient.fullName}
      </p>
      {!compact && (
        <p className="mt-0.5 truncate text-[10px]" style={{ color: "var(--muted)" }}>
          {item.appointmentType.name} · {duration} min
        </p>
      )}
      <p className="mt-0.5 truncate text-[10px] font-semibold" style={{ color: status.color }}>
        {status.label}
      </p>
    </Link>
  );
}

function HourLabels({ hours }: { hours: number[] }) {
  return (
    <div className="border-r" aria-hidden>
      <div className="h-14 border-b" />
      <div
        className="grid"
        style={{
          height: scheduleHeight,
          gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))`,
        }}
      >
        {hours.map((hour) => (
          <div
            key={hour}
            className="flex justify-end border-b px-2 pt-1 text-xs font-semibold"
            style={{ color: "var(--muted)" }}
          >
            {String(hour).padStart(2, "0")}:00
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleColumn({
  items,
  timeZone,
  workdayStartMinute,
  workdayEndMinute,
  hours,
  heading,
  compact = false,
}: {
  items: AgendaAppointment[];
  timeZone: string;
  workdayStartMinute: number;
  workdayEndMinute: number;
  hours: number[];
  heading?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 border-r last:border-r-0">
      <div className="flex h-14 items-center justify-center border-b px-2 text-center">
        {heading}
      </div>
      <div className="relative" style={{ height: scheduleHeight }}>
        <div
          className="grid h-full"
          style={{ gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))` }}
        >
          {hours.map((hour) => {
            const occupied = isHourOccupied(items, hour, timeZone);
            return (
              <div
                key={hour}
                className="min-h-0 border-b px-2 pt-1 text-[10px]"
                style={{
                  color: occupied ? "var(--muted)" : "var(--success)",
                  background: occupied ? "var(--surface-muted)" : "transparent",
                }}
              >
                {occupied ? "Ocupado" : "Disponível"}
              </div>
            );
          })}
        </div>
        {items.map((item) => (
          <ScheduleAppointment
            key={item.id}
            item={item}
            timeZone={timeZone}
            workdayStartMinute={workdayStartMinute}
            workdayEndMinute={workdayEndMinute}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarCard({ item, timeZone }: { item: AgendaAppointment; timeZone: string }) {
  const durationMinutes = Math.round(
    (new Date(item.endAt).getTime() - new Date(item.startAt).getTime()) / 60_000,
  );
  return (
    <Link
      href={`/agenda/${item.id}`}
      className={`block rounded-lg border-l-4 p-2 transition hover:brightness-95 ${item.status === "CANCELLED" ? "opacity-55" : ""}`}
      style={{ borderLeftColor: item.appointmentType.color, background: "var(--surface-muted)" }}
    >
      <p className="text-xs font-bold">
        {time(item.startAt, timeZone)} – {time(item.endAt, timeZone)}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold">{item.patient.fullName}</p>
      <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--muted)" }}>
        {item.appointmentType.name} · {durationMinutes} min
      </p>
      <div className="mt-2">
        <AppointmentStatusBadge status={item.status} />
      </div>
      {item.status === "CANCELLED" && item.cancellationSource === "PATIENT" && (
        <p className="mt-1 text-[11px] font-semibold" style={{ color: "var(--danger)" }}>
          Cancelada pelo paciente
        </p>
      )}
    </Link>
  );
}

export function AgendaCalendar({
  appointments,
  date,
  view,
  days,
  timeZone,
  initialWorkdayStartMinute,
  initialWorkdayEndMinute,
}: {
  appointments: AgendaAppointment[];
  date: string;
  view: "day" | "week" | "month";
  days: string[];
  timeZone: string;
  initialWorkdayStartMinute: number;
  initialWorkdayEndMinute: number;
}) {
  const router = useRouter();
  const [workdayStartMinute, setWorkdayStartMinute] = useState(initialWorkdayStartMinute);
  const [workdayEndMinute, setWorkdayEndMinute] = useState(initialWorkdayEndMinute);
  const [savingWorkday, setSavingWorkday] = useState(false);
  const previousStatuses = useRef(
    new Map(appointments.map((appointment) => [appointment.id, appointment.status])),
  );
  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [router]);
  useEffect(() => {
    for (const appointment of appointments) {
      const previous = previousStatuses.current.get(appointment.id);
      if (
        previous &&
        previous !== "CANCELLED" &&
        appointment.status === "CANCELLED" &&
        appointment.cancellationSource === "PATIENT"
      ) {
        toast.info(`${appointment.patient.fullName} cancelou a consulta.`);
      }
    }
    previousStatuses.current = new Map(
      appointments.map((appointment) => [appointment.id, appointment.status]),
    );
  }, [appointments]);
  const groups = new Map<string, AgendaAppointment[]>();
  for (const appointment of appointments) {
    const key = dateKey(appointment.startAt, timeZone);
    groups.set(key, [...(groups.get(key) ?? []), appointment]);
  }
  const moveAmount = view === "day" ? 1 : view === "week" ? 7 : 1;
  const moveUnit = view === "month" ? "month" : "day";
  const setView = (nextView: string) => router.push(`/agenda?view=${nextView}&date=${date}`);
  const hours = Array.from(
    { length: Math.ceil((workdayEndMinute - workdayStartMinute) / 60) },
    (_, index) => Math.floor(workdayStartMinute / 60) + index,
  );
  const validWorkday = workdayEndMinute - workdayStartMinute >= 60;
  async function saveWorkday() {
    if (!validWorkday) {
      toast.error("O expediente precisa ter pelo menos uma hora.");
      return;
    }
    setSavingWorkday(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workdayStartMinute, workdayEndMinute }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar o expediente.");
      toast.success("Horário de trabalho atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o expediente.");
    } finally {
      setSavingWorkday(false);
    }
  }
  const title = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    ...(view === "day" ? { day: "2-digit" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="eyebrow">Agenda clínica</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight capitalize">{title}</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Grade de {formatMinute(workdayStartMinute)} a {formatMinute(workdayEndMinute)} em{" "}
            {timeZone}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/agenda/novo" className="btn-primary">
            <Plus className="size-4" /> Nova consulta
          </Link>
          <div className="inline-flex rounded-xl border p-1">
            {(["day", "week", "month"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className="rounded-lg px-3 py-2 text-sm font-semibold"
                style={
                  view === item
                    ? { background: "var(--primary-soft)", color: "var(--primary)" }
                    : {}
                }
              >
                {{ day: "Dia", week: "Semana", month: "Mês" }[item]}
              </button>
            ))}
          </div>
          <Link
            href={`/agenda?view=${view}&date=${add(date, -moveAmount, moveUnit)}`}
            className="btn-secondary px-3"
            aria-label="Período anterior"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={`/agenda?view=${view}&date=${add(date, moveAmount, moveUnit)}`}
            className="btn-secondary px-3"
            aria-label="Próximo período"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </header>

      <section
        className="flex flex-wrap items-end gap-3 rounded-2xl border p-4"
        style={{ background: "var(--surface)" }}
      >
        <div>
          <p className="text-sm font-semibold">Meu horário de trabalho</p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
            A grade mostra somente este intervalo.
          </p>
        </div>
        <label className="ml-auto">
          <span className="label">Início</span>
          <select
            className="input min-w-28"
            value={workdayStartMinute}
            onChange={(event) => setWorkdayStartMinute(Number(event.target.value))}
          >
            {Array.from({ length: 23 }, (_, hour) => hour).map((hour) => (
              <option key={hour} value={hour * 60}>
                {formatMinute(hour * 60)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Fim</span>
          <select
            className="input min-w-28"
            value={workdayEndMinute}
            onChange={(event) => setWorkdayEndMinute(Number(event.target.value))}
          >
            {Array.from({ length: 23 }, (_, index) => index + 1).map((hour) => (
              <option key={hour} value={hour * 60}>
                {formatMinute(hour * 60)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void saveWorkday()}
          disabled={savingWorkday}
        >
          {savingWorkday ? "Salvando..." : "Aplicar horário"}
        </button>
      </section>

      {view === "day" && (
        <section
          className="overflow-hidden rounded-2xl border"
          style={{ background: "var(--surface)" }}
        >
          <div className="grid grid-cols-[72px_minmax(0,1fr)]">
            <HourLabels hours={hours} />
            <ScheduleColumn
              items={groups.get(days[0]) ?? []}
              timeZone={timeZone}
              workdayStartMinute={workdayStartMinute}
              workdayEndMinute={workdayEndMinute}
              hours={hours}
              heading={
                <div>
                  <p className="text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                    {new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(
                      new Date(`${days[0]}T12:00:00Z`),
                    )}
                  </p>
                  <p className="mt-1 text-lg font-bold">{days[0].slice(8, 10)}</p>
                </div>
              }
            />
          </div>
        </section>
      )}

      {view === "week" && (
        <section
          className="overflow-hidden rounded-2xl border"
          style={{ background: "var(--surface)" }}
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <HourLabels hours={hours} />
            {days.map((day) => (
              <ScheduleColumn
                key={day}
                items={groups.get(day) ?? []}
                timeZone={timeZone}
                workdayStartMinute={workdayStartMinute}
                workdayEndMinute={workdayEndMinute}
                hours={hours}
                compact
                heading={
                  <div>
                    <p
                      className="text-xs font-semibold uppercase"
                      style={{ color: "var(--muted)" }}
                    >
                      {new Intl.DateTimeFormat("pt-BR", {
                        weekday: "short",
                        timeZone: "UTC",
                      }).format(new Date(`${day}T12:00:00Z`))}
                    </p>
                    <p className="mt-1 text-lg font-bold">{day.slice(8, 10)}</p>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      {view === "month" && (
        <section
          className="overflow-hidden rounded-2xl border"
          style={{ background: "var(--surface)" }}
        >
          <div className="hidden grid-cols-7 border-b sm:grid">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
              <div
                key={label}
                className="p-2 text-center text-xs font-semibold"
                style={{ color: "var(--muted)" }}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-7">
            {days.map((day) => (
              <div key={day} className="min-h-28 border-b border-r p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold">{day.slice(8, 10)}</span>
                  <Link
                    href={`/agenda/novo?date=${day}`}
                    className="text-xs"
                    style={{ color: "var(--primary)" }}
                    aria-label={`Criar consulta em ${day}`}
                  >
                    +
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {(groups.get(day) ?? []).slice(0, 3).map((item) => (
                    <CalendarCard key={item.id} item={item} timeZone={timeZone} />
                  ))}
                  {(groups.get(day)?.length ?? 0) > 3 && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      + {(groups.get(day)?.length ?? 0) - 3} consultas
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

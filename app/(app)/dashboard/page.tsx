import {
  CircleDollarSign,
  CalendarDays,
  ClipboardCheck,
  ReceiptText,
  TrendingUp,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { AppointmentStatusBadge } from "@/components/appointment-status-badge";
import { DashboardCharts } from "@/components/dashboard-charts";
import { FinancialCard } from "@/components/financial-card";
import { GlobalPatientSearch } from "@/components/global-patient-search";
import { PeriodFilter } from "@/components/period-filter";
import { requirePageContext } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/money";
import { getDashboardData, type DashboardPeriod } from "@/services/dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const context = await requirePageContext();
  const search = await searchParams;
  const allowed = new Set(["today", "7d", "30d", "month", "year", "custom"]);
  const period = (allowed.has(search.period ?? "") ? search.period : "month") as DashboardPeriod;
  const data = await getDashboardData(context, { period, from: search.from, to: search.to });
  const metrics = data.metrics;
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard financeiro</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Indicadores calculados a partir dos procedimentos registrados.
          </p>
        </div>
        <PeriodFilter period={period} from={search.from} to={search.to} />
      </div>
      <section
        className="card border-0 p-5"
        style={{
          background:
            "linear-gradient(135deg, var(--primary-soft), color-mix(in srgb, var(--surface) 85%, var(--primary)))",
        }}
      >
        <p className="mb-3 text-sm font-semibold">Encontre rapidamente um paciente</p>
        <GlobalPatientSearch />
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 className="mt-1 font-semibold">Consultas de hoje</h2>
            </div>
            <Link href="/agenda?view=day" className="btn-secondary">
              Ver agenda
            </Link>
          </div>
          <div className="mt-4 divide-y">
            {data.todayAppointments.length ? (
              data.todayAppointments.map((item) => (
                <Link
                  key={item.id}
                  href={`/agenda/${item.id}`}
                  className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                      {new Intl.DateTimeFormat("pt-BR", {
                        timeZone: data.timezone,
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(item.startAt)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.patient?.fullName ?? item.guestName ?? "Sem ficha"}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {item.appointmentType.name}
                      </p>
                    </div>
                  </div>
                  <AppointmentStatusBadge status={item.status} />
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                Nenhuma consulta hoje.
              </p>
            )}
          </div>
        </section>
        <section className="card" style={{ background: "var(--primary-soft)" }}>
          <CalendarDays className="size-6" style={{ color: "var(--primary)" }} />
          <p
            className="mt-4 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            Próxima consulta
          </p>
          {data.nextAppointment ? (
            <>
              <p className="mt-2 text-3xl font-bold">
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: data.timezone,
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(data.nextAppointment.startAt)}
              </p>
              <p className="mt-2 font-semibold">{data.nextAppointment.patient?.fullName ?? data.nextAppointment.guestName ?? "Sem ficha"}</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {data.nextAppointment.appointmentType.name}
              </p>
              <Link
                href={data.nextAppointment.patient ? `/pacientes/${data.nextAppointment.patient.id}` : `/agenda/${data.nextAppointment.id}`}
                className="btn-secondary mt-5"
              >
                {data.nextAppointment.patient ? "Ver paciente" : "Ver consulta"}
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
              Nenhuma consulta futura.
            </p>
          )}
        </section>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FinancialCard
          label="Faturamento total"
          value={formatCurrency(metrics.revenueCents)}
          icon={CircleDollarSign}
        />
        <FinancialCard
          label="Lucro total"
          value={formatCurrency(metrics.profitCents)}
          icon={TrendingUp}
          tone="success"
        />
        <FinancialCard
          label="Custos"
          value={formatCurrency(metrics.costsCents)}
          icon={ReceiptText}
          tone="danger"
        />
        <FinancialCard
          label="Pacientes atendidos"
          value={String(metrics.patients)}
          icon={UserRoundCheck}
          tone="neutral"
        />
        <FinancialCard
          label="Procedimentos realizados"
          value={String(metrics.procedures)}
          icon={ClipboardCheck}
          tone="neutral"
        />
        <FinancialCard
          label="Ticket médio"
          value={formatCurrency(metrics.averageTicketCents)}
          icon={WalletCards}
        />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinancialCard
          label="Consultas agendadas"
          value={String(data.appointmentMetrics.scheduled)}
          icon={CalendarDays}
          tone="neutral"
        />
        <FinancialCard
          label="Realizadas"
          value={String(data.appointmentMetrics.completed)}
          icon={ClipboardCheck}
          tone="success"
        />
        <FinancialCard
          label="Canceladas"
          value={String(data.appointmentMetrics.cancelled)}
          icon={ReceiptText}
          tone="danger"
        />
        <FinancialCard
          label="Não comparecimentos"
          value={String(data.appointmentMetrics.noShow)}
          icon={UserRoundCheck}
          tone="danger"
        />
        <FinancialCard
          label="Taxa de comparecimento"
          value={`${data.appointmentMetrics.attendanceRate}%`}
          icon={TrendingUp}
        />
        <FinancialCard
          label="Taxa de cancelamento"
          value={`${data.appointmentMetrics.cancellationRate}%`}
          icon={TrendingUp}
          tone="danger"
        />
        <FinancialCard
          label="Taxa de confirmação"
          value={`${data.appointmentMetrics.confirmationRate}%`}
          icon={ClipboardCheck}
          tone="success"
        />
      </section>
      <DashboardCharts data={data.chart} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Procedimentos mais rentáveis</h2>
          <div className="mt-4 divide-y">
            {data.profitableProcedures.length ? (
              data.profitableProcedures.map((item, index) => (
                <div className="flex items-center justify-between gap-4 py-3" key={item.name}>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-8 items-center justify-center rounded-lg text-xs font-bold"
                      style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                    {formatCurrency(item.profit)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                Nenhum procedimento no período.
              </p>
            )}
          </div>
        </section>
        <section className="card">
          <h2 className="font-semibold">Pacientes com maior faturamento</h2>
          <div className="mt-4 divide-y">
            {data.topPatients.length ? (
              data.topPatients.map((item, index) => (
                <div className="flex items-center justify-between gap-4 py-3" key={item.name}>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-8 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "var(--surface-muted)" }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(item.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
                Nenhum faturamento no período.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

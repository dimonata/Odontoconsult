import "server-only";

import type { AuthContext } from "@/lib/auth-context";
import { civilDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { clinicDayRange, clinicToday, zonedDateTimeToUtc } from "@/lib/timezone";

export type DashboardPeriod = "today" | "7d" | "30d" | "month" | "year" | "custom";

function isoToday(timeZone = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, amount: number) {
  const result = civilDate(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

export function resolvePeriod(
  period: DashboardPeriod,
  from?: string,
  to?: string,
  timeZone = "America/Sao_Paulo",
) {
  const today = isoToday(timeZone);
  if (period === "today") return { from: today, to: today };
  if (period === "7d") return { from: addDays(today, -6), to: today };
  if (period === "30d") return { from: addDays(today, -29), to: today };
  if (period === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (period === "year") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  return { from: from ?? addDays(today, -29), to: to ?? today };
}

export async function getDashboardData(
  context: AuthContext,
  input: { period: DashboardPeriod; from?: string; to?: string },
) {
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: context.clinicId },
    select: { timezone: true },
  });
  const range = resolvePeriod(input.period, input.from, input.to, clinic.timezone);
  const afterTo = addDays(range.to, 1);
  const appointmentFrom = zonedDateTimeToUtc(range.from, "00:00", clinic.timezone);
  const appointmentTo = zonedDateTimeToUtc(afterTo, "00:00", clinic.timezone);
  const today = clinicToday(clinic.timezone);
  const todayRange = clinicDayRange(today, clinic.timezone);
  const [procedures, appointments, todayAppointments, nextAppointment] = await Promise.all([
    prisma.procedure.findMany({
      where: {
        clinicId: context.clinicId,
        deletedAt: null,
        performedAt: { gte: civilDate(range.from), lte: civilDate(range.to) },
      },
      select: {
        id: true,
        performedAt: true,
        chargedAmountCents: true,
        costCents: true,
        patientId: true,
        patient: { select: { fullName: true } },
        procedureTypeId: true,
        procedureType: { select: { name: true } },
      },
      orderBy: { performedAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { clinicId: context.clinicId, startAt: { gte: appointmentFrom, lt: appointmentTo } },
      select: { status: true },
    }),
    prisma.appointment.findMany({
      where: { clinicId: context.clinicId, startAt: { gte: todayRange.start, lt: todayRange.end } },
      select: {
        id: true,
        startAt: true,
        status: true,
        guestName: true,
        patient: { select: { fullName: true } },
        appointmentType: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findFirst({
      where: {
        clinicId: context.clinicId,
        startAt: { gte: new Date() },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        startAt: true,
        guestName: true,
        patient: { select: { id: true, fullName: true } },
        appointmentType: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
  ]);

  let revenue = 0;
  let costs = 0;
  const patients = new Set<string>();
  const monthly = new Map<string, { revenue: number; costs: number; procedures: number }>();
  const typeTotals = new Map<string, { name: string; revenue: number; profit: number }>();
  const patientTotals = new Map<string, { name: string; revenue: number; profit: number }>();

  for (const item of procedures) {
    const charged = Number(item.chargedAmountCents);
    const cost = Number(item.costCents);
    const profit = charged - cost;
    revenue += charged;
    costs += cost;
    patients.add(item.patientId);

    const monthKey = item.performedAt.toISOString().slice(0, 7);
    const month = monthly.get(monthKey) ?? { revenue: 0, costs: 0, procedures: 0 };
    month.revenue += charged;
    month.costs += cost;
    month.procedures += 1;
    monthly.set(monthKey, month);

    const type = typeTotals.get(item.procedureTypeId) ?? {
      name: item.procedureType.name,
      revenue: 0,
      profit: 0,
    };
    type.revenue += charged;
    type.profit += profit;
    typeTotals.set(item.procedureTypeId, type);

    const patient = patientTotals.get(item.patientId) ?? {
      name: item.patient.fullName,
      revenue: 0,
      profit: 0,
    };
    patient.revenue += charged;
    patient.profit += profit;
    patientTotals.set(item.patientId, patient);
  }

  const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
  const chart = [...monthly.entries()].map(([key, value]) => ({
    month: monthFormatter.format(new Date(`${key}-01T00:00:00.000Z`)).replace(" de ", "/"),
    revenue: value.revenue / 100,
    costs: value.costs / 100,
    profit: (value.revenue - value.costs) / 100,
    procedures: value.procedures,
  }));
  const completed = appointments.filter((item) => item.status === "COMPLETED").length;
  const cancelled = appointments.filter((item) => item.status === "CANCELLED").length;
  const noShow = appointments.filter((item) => item.status === "NO_SHOW").length;
  const confirmed = appointments.filter((item) =>
    ["CONFIRMED", "COMPLETED"].includes(item.status),
  ).length;
  const attendanceBase = completed + noShow;

  return {
    period: range,
    metrics: {
      revenueCents: revenue,
      costsCents: costs,
      profitCents: revenue - costs,
      patients: patients.size,
      procedures: procedures.length,
      averageTicketCents: procedures.length ? Math.round(revenue / procedures.length) : 0,
    },
    chart,
    profitableProcedures: [...typeTotals.values()].sort((a, b) => b.profit - a.profit).slice(0, 5),
    topPatients: [...patientTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    appointmentMetrics: {
      scheduled: appointments.length,
      completed,
      cancelled,
      noShow,
      attendanceRate: attendanceBase ? Math.round((completed / attendanceBase) * 100) : 0,
      cancellationRate: appointments.length
        ? Math.round((cancelled / appointments.length) * 100)
        : 0,
      confirmationRate: appointments.length
        ? Math.round((confirmed / appointments.length) * 100)
        : 0,
    },
    todayAppointments,
    nextAppointment,
    timezone: clinic.timezone,
  };
}

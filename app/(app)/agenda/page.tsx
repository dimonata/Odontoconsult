import { AgendaCalendar, type AgendaAppointment } from "@/components/agenda-calendar";
import { requirePageContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { clinicToday, zonedDateTimeToUtc } from "@/lib/timezone";
import { listAppointments } from "@/services/appointments";

export const metadata = { title: "Agenda" };

function shift(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function visibleDays(date: string, view: "day" | "week" | "month") {
  if (view === "day") return [date];
  const pivot = new Date(`${date}T12:00:00.000Z`);
  if (view === "week") {
    const mondayOffset = (pivot.getUTCDay() + 6) % 7;
    const monday = shift(date, -mondayOffset);
    return Array.from({ length: 7 }, (_, index) => shift(monday, index));
  }
  const first = `${date.slice(0, 7)}-01`;
  const firstDate = new Date(`${first}T12:00:00.000Z`);
  const mondayOffset = (firstDate.getUTCDay() + 6) % 7;
  const start = shift(first, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => shift(start, index));
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const context = await requirePageContext();
  const [clinic, preference] = await Promise.all([
    prisma.clinic.findUniqueOrThrow({
      where: { id: context.clinicId },
      select: { timezone: true },
    }),
    prisma.userPreference.findUnique({
      where: { userId: context.userId },
      select: { workdayStartMinute: true, workdayEndMinute: true },
    }),
  ]);
  const search = await searchParams;
  const view = (["day", "week", "month"].includes(search.view ?? "") ? search.view : "week") as
    "day" | "week" | "month";
  const fallback = clinicToday(clinic.timezone);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(search.date ?? "") ? search.date! : fallback;
  const days = visibleDays(date, view);
  const from = zonedDateTimeToUtc(days[0], "00:00", clinic.timezone);
  const to = zonedDateTimeToUtc(shift(days.at(-1)!, 1), "00:00", clinic.timezone);
  const appointments = await listAppointments(context, { from, to });
  const serialized: AgendaAppointment[] = appointments.map((item) => ({
    id: item.id,
    startAt: item.startAt.toISOString(),
    endAt: item.endAt.toISOString(),
    status: item.status,
    cancellationSource: item.cancellationSource,
    patient: item.patient ? { id: item.patient.id, fullName: item.patient.fullName } : null,
    guestName: item.guestName,
    dentist: item.dentist,
    appointmentType: item.appointmentType,
  }));
  return (
    <AgendaCalendar
      appointments={serialized}
      date={date}
      view={view}
      days={days}
      timeZone={clinic.timezone}
      initialWorkdayStartMinute={preference?.workdayStartMinute ?? 420}
      initialWorkdayEndMinute={preference?.workdayEndMinute ?? 1_200}
    />
  );
}

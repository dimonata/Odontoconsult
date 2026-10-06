import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppointmentDetails } from "@/components/appointment-details";
import { requirePageContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { localParts } from "@/lib/timezone";
import { getAppointment } from "@/services/appointments";

export const metadata = { title: "Detalhes da consulta" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePageContext();
  const { id } = await params;
  const appointment = await getAppointment(context, id);
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: context.clinicId },
    select: { timezone: true },
  });
  const local = localParts(appointment.startAt, clinic.timezone);
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/agenda"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft className="size-4" /> Voltar para agenda
      </Link>
      <AppointmentDetails
        appointment={{
          id: appointment.id,
          status: appointment.status,
          calendarSyncStatus: appointment.calendarSyncStatus,
          calendarSyncError: appointment.calendarSyncError,
          date: local.date,
          startTime: local.time,
          durationMinutes: Math.round(
            (appointment.endAt.getTime() - appointment.startAt.getTime()) / 60_000,
          ),
          notes: appointment.notes,
          patient: appointment.patient,
          dentist: appointment.dentist,
          appointmentType: appointment.appointmentType,
          timezone: clinic.timezone,
          history: appointment.history.map((item) => ({
            id: item.id,
            action: item.action,
            previousStartAt: item.previousStartAt?.toISOString() ?? null,
            newStartAt: item.newStartAt?.toISOString() ?? null,
            previousStatus: item.previousStatus,
            newStatus: item.newStatus,
            createdAt: item.createdAt.toISOString(),
            changedBy: item.changedBy,
          })),
        }}
      />
    </div>
  );
}

import "server-only";

import type { AppointmentStatus, Prisma } from "@/generated/prisma/client";
import type { AuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { localParts, zonedDateTimeToUtc } from "@/lib/timezone";
import { googleCalendarConflict, syncAppointmentToGoogle } from "@/services/google-calendar";

type AppointmentInput = {
  patientId: string;
  dentistId: string;
  appointmentTypeId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes: string;
};

const appointmentInclude = {
  patient: { select: { id: true, fullName: true, phone: true } },
  dentist: { select: { id: true, name: true } },
  appointmentType: { select: { id: true, name: true, color: true } },
} satisfies Prisma.AppointmentInclude;

async function resources(context: AuthContext, input: AppointmentInput) {
  const [clinic, patient, appointmentType, dentist] = await Promise.all([
    prisma.clinic.findUnique({
      where: { id: context.clinicId },
      select: { timezone: true, confirmationLeadMinutes: true },
    }),
    prisma.patient.findFirst({
      where: { id: input.patientId, clinicId: context.clinicId, archivedAt: null },
      select: { id: true },
    }),
    prisma.appointmentType.findFirst({
      where: { id: input.appointmentTypeId, clinicId: context.clinicId, active: true },
      select: { id: true },
    }),
    prisma.clinicMember.findFirst({
      where: {
        clinicId: context.clinicId,
        userId: input.dentistId,
        status: "ACTIVE",
        role: { in: ["OWNER", "DENTIST"] },
      },
      select: { userId: true },
    }),
  ]);
  if (!clinic) throw new AppError(404, "Consultório não encontrado.", "CLINIC_NOT_FOUND");
  if (!patient) throw new AppError(404, "Paciente não encontrado.", "PATIENT_NOT_FOUND");
  if (!appointmentType)
    throw new AppError(404, "Tipo de atendimento não encontrado.", "TYPE_NOT_FOUND");
  if (!dentist) throw new AppError(404, "Dentista não encontrado.", "DENTIST_NOT_FOUND");
  return clinic;
}

async function assertNoConflict(input: {
  clinicId: string;
  dentistId: string;
  startAt: Date;
  endAt: Date;
  excludeId?: string;
}) {
  const conflict = await prisma.appointment.findFirst({
    where: {
      clinicId: input.clinicId,
      dentistId: input.dentistId,
      id: input.excludeId ? { not: input.excludeId } : undefined,
      status: { not: "CANCELLED" },
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (conflict) {
    throw new AppError(409, "Você já possui uma consulta neste horário.", "TIME_CONFLICT", {
      appointmentId: conflict.id,
      startAt: conflict.startAt.toISOString(),
      endAt: conflict.endAt.toISOString(),
    });
  }

  try {
    const googleConflict = await googleCalendarConflict({
      clinicId: input.clinicId,
      userId: input.dentistId,
      startAt: input.startAt,
      endAt: input.endAt,
    });
    if (googleConflict) {
      throw new AppError(
        409,
        "Você já possui um compromisso no Google Calendar.",
        "GOOGLE_TIME_CONFLICT",
        {
          startAt: googleConflict.start,
          endAt: googleConflict.end,
        },
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    // O calendário externo nunca impede que a fonte de verdade local seja salva.
  }
}

function schedule(input: AppointmentInput, timezone: string) {
  const startAt = zonedDateTimeToUtc(input.date, input.startTime, timezone);
  if (Number.isNaN(startAt.getTime()))
    throw new AppError(422, "Data ou horário inválido.", "INVALID_DATETIME");
  const endAt = new Date(startAt.getTime() + input.durationMinutes * 60_000);
  return { startAt, endAt };
}

export async function createAppointment(context: AuthContext, input: AppointmentInput) {
  const clinic = await resources(context, input);
  const { startAt, endAt } = schedule(input, clinic.timezone);
  await assertNoConflict({
    clinicId: context.clinicId,
    dentistId: input.dentistId,
    startAt,
    endAt,
  });
  const confirmationScheduledAt = new Date(
    startAt.getTime() - clinic.confirmationLeadMinutes * 60_000,
  );
  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        clinicId: context.clinicId,
        patientId: input.patientId,
        dentistId: input.dentistId,
        appointmentTypeId: input.appointmentTypeId,
        startAt,
        endAt,
        notes: input.notes || null,
        confirmationScheduledAt,
      },
      include: appointmentInclude,
    });
    await Promise.all([
      tx.auditLog.create({
        data: {
          clinicId: context.clinicId,
          userId: context.userId,
          action: "APPOINTMENT_CREATED",
          entityType: "Appointment",
          entityId: created.id,
        },
      }),
      tx.appointmentHistory.create({
        data: {
          appointmentId: created.id,
          clinicId: context.clinicId,
          changedById: context.userId,
          action: "APPOINTMENT_CREATED",
          newStartAt: startAt,
          newEndAt: endAt,
          newStatus: "SCHEDULED",
        },
      }),
    ]);
    return created;
  });
  await syncAppointmentToGoogle(appointment.id);
  return prisma.appointment.findUniqueOrThrow({
    where: { id: appointment.id },
    include: appointmentInclude,
  });
}

export async function updateAppointment(
  context: AuthContext,
  id: string,
  input: Partial<AppointmentInput> & {
    status?: AppointmentStatus;
    cancellationSource?: "PATIENT" | "DENTIST" | "SYSTEM";
  },
) {
  const current = await prisma.appointment.findFirst({
    where: { id, clinicId: context.clinicId },
    include: { clinic: { select: { timezone: true, confirmationLeadMinutes: true } } },
  });
  if (!current) throw new AppError(404, "Consulta não encontrada.", "APPOINTMENT_NOT_FOUND");
  const currentLocal = localParts(current.startAt, current.clinic.timezone);
  const completeInput: AppointmentInput = {
    patientId: input.patientId ?? current.patientId,
    dentistId: input.dentistId ?? current.dentistId,
    appointmentTypeId: input.appointmentTypeId ?? current.appointmentTypeId,
    date: input.date ?? currentLocal.date,
    startTime: input.startTime ?? currentLocal.time,
    durationMinutes:
      input.durationMinutes ??
      Math.round((current.endAt.getTime() - current.startAt.getTime()) / 60_000),
    notes: input.notes ?? current.notes ?? "",
  };
  const clinic = await resources(context, completeInput);
  const { startAt, endAt } = schedule(completeInput, clinic.timezone);
  const rescheduled =
    startAt.getTime() !== current.startAt.getTime() || endAt.getTime() !== current.endAt.getTime();
  if (rescheduled || completeInput.dentistId !== current.dentistId) {
    await assertNoConflict({
      clinicId: context.clinicId,
      dentistId: completeInput.dentistId,
      startAt,
      endAt,
      excludeId: current.id,
    });
  }
  const nextStatus =
    input.status ?? (rescheduled && current.status === "CONFIRMED" ? "SCHEDULED" : current.status);
  const now = new Date();
  const action =
    nextStatus === "CANCELLED" && current.status !== "CANCELLED"
      ? "APPOINTMENT_CANCELLED"
      : nextStatus === "CONFIRMED" && current.status !== "CONFIRMED"
        ? "APPOINTMENT_CONFIRMED"
        : rescheduled
          ? "APPOINTMENT_RESCHEDULED"
          : "APPOINTMENT_UPDATED";

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: current.id },
      data: {
        patientId: completeInput.patientId,
        dentistId: completeInput.dentistId,
        appointmentTypeId: completeInput.appointmentTypeId,
        startAt,
        endAt,
        notes: completeInput.notes || null,
        status: nextStatus,
        calendarSyncStatus: "PENDING",
        confirmationScheduledAt: rescheduled
          ? new Date(startAt.getTime() - clinic.confirmationLeadMinutes * 60_000)
          : undefined,
        confirmationSentAt: rescheduled ? null : undefined,
        confirmedAt: nextStatus === "CONFIRMED" ? now : rescheduled ? null : undefined,
        cancelledAt: nextStatus === "CANCELLED" ? now : null,
        cancellationSource:
          nextStatus === "CANCELLED" ? (input.cancellationSource ?? "DENTIST") : null,
      },
    });
    await Promise.all([
      tx.auditLog.create({
        data: {
          clinicId: context.clinicId,
          userId: context.userId,
          action,
          entityType: "Appointment",
          entityId: current.id,
        },
      }),
      tx.appointmentHistory.create({
        data: {
          appointmentId: current.id,
          clinicId: context.clinicId,
          changedById: context.userId,
          action,
          previousStartAt: current.startAt,
          previousEndAt: current.endAt,
          newStartAt: startAt,
          newEndAt: endAt,
          previousStatus: current.status,
          newStatus: nextStatus,
        },
      }),
    ]);
  });
  await syncAppointmentToGoogle(current.id);
  return prisma.appointment.findUniqueOrThrow({
    where: { id: current.id },
    include: appointmentInclude,
  });
}

export async function listAppointments(
  context: AuthContext,
  input: { from: Date; to: Date; patientId?: string },
) {
  return prisma.appointment.findMany({
    where: {
      clinicId: context.clinicId,
      patientId: input.patientId,
      startAt: { lt: input.to },
      endAt: { gt: input.from },
    },
    include: appointmentInclude,
    orderBy: { startAt: "asc" },
  });
}

export async function getAppointment(context: AuthContext, id: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, clinicId: context.clinicId },
    include: {
      ...appointmentInclude,
      history: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  if (!appointment) throw new AppError(404, "Consulta não encontrada.", "APPOINTMENT_NOT_FOUND");
  return appointment;
}

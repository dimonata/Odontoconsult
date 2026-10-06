import { prisma } from "@/lib/db";
import { localParts } from "@/lib/timezone";
import { messagingProvider } from "@/services/messaging";

function authorized(request: Request) {
  const configured = process.env.CRON_SECRET;
  return Boolean(configured && request.headers.get("authorization") === `Bearer ${configured}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      confirmationSentAt: null,
      confirmationScheduledAt: { lte: now },
      startAt: { gt: now },
      clinic: { subscription: { status: "AUTHORIZED" } },
    },
    include: {
      patient: { select: { fullName: true, phoneNormalized: true } },
      clinic: { select: { name: true, timezone: true } },
    },
    orderBy: { confirmationScheduledAt: "asc" },
    take: 100,
  });
  const provider = messagingProvider();
  let sent = 0;
  let failed = 0;

  for (const appointment of appointments) {
    const idempotencyKey = `confirmation:${appointment.id}:${appointment.startAt.toISOString()}`;
    const message = await prisma.appointmentMessage.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        appointmentId: appointment.id,
        clinicId: appointment.clinicId,
        patientId: appointment.patientId,
        provider: provider.name,
        idempotencyKey,
        type: "CONFIRMATION_REQUEST",
      },
    });
    if (["SENT", "DELIVERED", "RESPONDED"].includes(message.status)) continue;
    const claim = await prisma.appointmentMessage.updateMany({
      where: { id: message.id, status: { in: ["QUEUED", "FAILED"] } },
      data: { status: "PROCESSING", failureCode: null },
    });
    if (!claim.count) continue;
    const local = localParts(appointment.startAt, appointment.clinic.timezone);
    try {
      const result = await provider.sendConfirmation({
        to: appointment.patient.phoneNormalized,
        patientFirstName: appointment.patient.fullName.trim().split(/\s+/)[0],
        clinicName: appointment.clinic.name,
        date: local.date.split("-").reverse().join("/"),
        time: local.time,
      });
      await prisma.$transaction([
        prisma.appointmentMessage.update({
          where: { id: message.id },
          data: {
            status: "SENT",
            sentAt: now,
            providerMessageId: result.providerMessageId,
            failureCode: null,
          },
        }),
        prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: "CONFIRMATION_PENDING", confirmationSentAt: now },
        }),
        prisma.auditLog.create({
          data: {
            clinicId: appointment.clinicId,
            userId: appointment.dentistId,
            action: "REMINDER_SENT",
            entityType: "Appointment",
            entityId: appointment.id,
          },
        }),
        prisma.appointmentHistory.create({
          data: {
            appointmentId: appointment.id,
            clinicId: appointment.clinicId,
            changedById: appointment.dentistId,
            action: "APPOINTMENT_UPDATED",
            previousStatus: appointment.status,
            newStatus: "CONFIRMATION_PENDING",
          },
        }),
      ]);
      sent += 1;
    } catch (error) {
      const failureCode = error instanceof Error ? error.message.slice(0, 100) : "MESSAGE_FAILED";
      await prisma.$transaction([
        prisma.appointmentMessage.update({
          where: { id: message.id },
          data: { status: "FAILED", failureCode },
        }),
        prisma.auditLog.create({
          data: {
            clinicId: appointment.clinicId,
            userId: appointment.dentistId,
            action: "REMINDER_FAILED",
            entityType: "Appointment",
            entityId: appointment.id,
          },
        }),
      ]);
      failed += 1;
    }
  }
  return Response.json({ inspected: appointments.length, sent, failed });
}

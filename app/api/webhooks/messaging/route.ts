import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { syncAppointmentToGoogle } from "@/services/google-calendar";

const responseSchema = z.object({
  providerMessageId: z.string().min(1),
  action: z.enum(["CONFIRM", "CANCEL"]),
});

type PatientAction = z.infer<typeof responseSchema>;

type WhatsAppMessage = {
  context?: { id?: string };
  button?: { payload?: string; text?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
  };
};

type WhatsAppStatus = {
  id?: string;
  status?: string;
  errors?: Array<{ code?: number }>;
};

type WhatsAppPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[];
        statuses?: WhatsAppStatus[];
      };
    }>;
  }>;
};

function verifyWhatsAppSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`,
  );
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function patientAction(message: WhatsAppMessage): PatientAction | null {
  const providerMessageId = message.context?.id;
  const rawAction =
    message.interactive?.button_reply?.id ??
    message.button?.payload ??
    message.interactive?.button_reply?.title ??
    message.button?.text;
  if (!providerMessageId || !rawAction) return null;
  const normalized = rawAction.trim().toUpperCase();
  if (["CONFIRM", "CONFIRMAR", "APPOINTMENT_CONFIRM"].includes(normalized)) {
    return { providerMessageId, action: "CONFIRM" };
  }
  if (["CANCEL", "CANCELAR", "APPOINTMENT_CANCEL"].includes(normalized)) {
    return { providerMessageId, action: "CANCEL" };
  }
  return null;
}

async function updateDeliveryStatus(status: WhatsAppStatus) {
  if (!status.id) return;
  if (status.status === "delivered" || status.status === "read") {
    await prisma.appointmentMessage.updateMany({
      where: { providerMessageId: status.id, status: { in: ["SENT", "DELIVERED"] } },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
  } else if (status.status === "failed") {
    await prisma.appointmentMessage.updateMany({
      where: { providerMessageId: status.id },
      data: {
        status: "FAILED",
        failureCode: status.errors?.[0]?.code
          ? `WHATSAPP_${status.errors[0].code}`
          : "WHATSAPP_DELIVERY_FAILED",
      },
    });
  }
}

async function applyPatientAction(input: PatientAction) {
  const message = await prisma.appointmentMessage.findFirst({
    where: { providerMessageId: input.providerMessageId },
    include: {
      appointment: {
        select: { id: true, dentistId: true, clinicId: true, status: true },
      },
    },
  });
  if (!message) return;
  if (!["SCHEDULED", "CONFIRMATION_PENDING"].includes(message.appointment.status)) return;

  const confirmed = input.action === "CONFIRM";
  const now = new Date();
  await prisma.$transaction([
    prisma.appointmentMessage.update({
      where: { id: message.id },
      data: { status: "RESPONDED", respondedAt: now },
    }),
    prisma.appointment.update({
      where: { id: message.appointment.id },
      data: confirmed
        ? { status: "CONFIRMED", confirmedAt: now }
        : { status: "CANCELLED", cancelledAt: now, cancellationSource: "PATIENT" },
    }),
    prisma.auditLog.create({
      data: {
        clinicId: message.appointment.clinicId,
        userId: message.appointment.dentistId,
        action: confirmed ? "APPOINTMENT_CONFIRMED" : "APPOINTMENT_CANCELLED",
        entityType: "Appointment",
        entityId: message.appointment.id,
      },
    }),
    prisma.appointmentHistory.create({
      data: {
        appointmentId: message.appointment.id,
        clinicId: message.appointment.clinicId,
        changedById: message.appointment.dentistId,
        action: confirmed ? "APPOINTMENT_CONFIRMED" : "APPOINTMENT_CANCELLED",
        previousStatus: message.appointment.status,
        newStatus: confirmed ? "CONFIRMED" : "CANCELLED",
      },
    }),
  ]);
  await syncAppointmentToGoogle(message.appointment.id);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const valid =
    url.searchParams.get("hub.mode") === "subscribe" &&
    Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) &&
    url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const challenge = url.searchParams.get("hub.challenge");
  if (!valid || !challenge) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, { headers: { "content-type": "text/plain" } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const genericAuthorized =
    Boolean(process.env.MESSAGING_WEBHOOK_SECRET) &&
    request.headers.get("x-webhook-secret") === process.env.MESSAGING_WEBHOOK_SECRET;
  const whatsappAuthorized = verifyWhatsAppSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
  );
  if (!genericAuthorized && !whatsappAuthorized) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Payload inválido." }, { status: 422 });
  }

  if (genericAuthorized) {
    const parsed = responseSchema.safeParse(payload);
    if (!parsed.success) return Response.json({ error: "Payload inválido." }, { status: 422 });
    await applyPatientAction(parsed.data);
    return Response.json({ ok: true });
  }

  const whatsapp = payload as WhatsAppPayload;
  for (const entry of whatsapp.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) await updateDeliveryStatus(status);
      for (const message of change.value?.messages ?? []) {
        const action = patientAction(message);
        if (action) await applyPatientAction(action);
      }
    }
  }
  return Response.json({ ok: true });
}

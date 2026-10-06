import "server-only";

import type { CalendarIntegration } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { hasPremiumAccess } from "@/lib/subscription";

const tokenEndpoint = "https://oauth2.googleapis.com/token";

async function accessToken(integration: CalendarIntegration) {
  if (
    integration.encryptedAccessToken &&
    integration.accessTokenExpiresAt &&
    integration.accessTokenExpiresAt.getTime() > Date.now() + 60_000
  ) {
    return decryptSecret(integration.encryptedAccessToken);
  }
  if (!integration.encryptedRefreshToken) throw new Error("GOOGLE_AUTHORIZATION_REVOKED");
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      refresh_token: decryptSecret(integration.encryptedRefreshToken),
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("GOOGLE_TOKEN_REFRESH_FAILED");
  const payload = (await response.json()) as { access_token: string; expires_in: number };
  await prisma.calendarIntegration.update({
    where: { id: integration.id },
    data: {
      encryptedAccessToken: encryptSecret(payload.access_token),
      accessTokenExpiresAt: new Date(Date.now() + payload.expires_in * 1000),
    },
  });
  return payload.access_token;
}

async function googleRequest<T>(
  integration: CalendarIntegration,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${await accessToken(integration)}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`GOOGLE_CALENDAR_${response.status}`);
  return (response.status === 204 ? null : await response.json()) as T;
}

function isMissingGoogleEvent(error: unknown) {
  return (
    error instanceof Error && ["GOOGLE_CALENDAR_404", "GOOGLE_CALENDAR_410"].includes(error.message)
  );
}

export async function listGoogleCalendars(clinicId: string, userId: string) {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { clinicId_userId: { clinicId, userId } },
  });
  if (!integration || integration.revokedAt) return null;
  const payload = await googleRequest<{
    items?: Array<{ id: string; summary: string; primary?: boolean }>;
  }>(integration, "/users/me/calendarList?minAccessRole=writer");
  return { integration, calendars: payload.items ?? [] };
}

export async function googleCalendarConflict(input: {
  clinicId: string;
  userId: string;
  startAt: Date;
  endAt: Date;
}) {
  if (!(await hasPremiumAccess(input.clinicId))) return null;
  const integration = await prisma.calendarIntegration.findUnique({
    where: { clinicId_userId: { clinicId: input.clinicId, userId: input.userId } },
  });
  if (!integration || integration.revokedAt) return null;
  const payload = await googleRequest<{
    calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
  }>(integration, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: input.startAt.toISOString(),
      timeMax: input.endAt.toISOString(),
      items: [{ id: integration.googleCalendarId }],
    }),
  });
  return payload.calendars?.[integration.googleCalendarId]?.busy?.[0] ?? null;
}

export async function syncAppointmentToGoogle(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: { select: { fullName: true } }, clinic: { select: { timezone: true } } },
  });
  if (!appointment) return;
  if (!(await hasPremiumAccess(appointment.clinicId))) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { calendarSyncStatus: "NOT_CONNECTED", calendarSyncError: null },
    });
    return;
  }
  const integration = await prisma.calendarIntegration.findUnique({
    where: {
      clinicId_userId: { clinicId: appointment.clinicId, userId: appointment.dentistId },
    },
  });
  if (!integration || integration.revokedAt) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { calendarSyncStatus: "NOT_CONNECTED", calendarSyncError: null },
    });
    return;
  }

  try {
    if (appointment.status === "CANCELLED") {
      if (appointment.googleEventId) {
        try {
          await googleRequest(
            integration,
            `/calendars/${encodeURIComponent(integration.googleCalendarId)}/events/${encodeURIComponent(appointment.googleEventId)}`,
            { method: "DELETE" },
          );
        } catch (error) {
          if (!isMissingGoogleEvent(error)) throw error;
        }
      }
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          googleEventId: null,
          googleCalendarId: null,
          calendarSyncStatus: "SYNCED",
          calendarSyncError: null,
        },
      });
      return;
    }

    const firstName = appointment.patient.fullName.trim().split(/\s+/)[0];
    const body = JSON.stringify({
      summary: `Consulta odontológica — ${firstName}`,
      description: "Agendamento realizado pelo sistema odontológico.",
      start: { dateTime: appointment.startAt.toISOString(), timeZone: appointment.clinic.timezone },
      end: { dateTime: appointment.endAt.toISOString(), timeZone: appointment.clinic.timezone },
      visibility: "private",
      extendedProperties: { private: { odontoFlowAppointmentId: appointment.id } },
    });
    const path = appointment.googleEventId
      ? `/calendars/${encodeURIComponent(integration.googleCalendarId)}/events/${encodeURIComponent(appointment.googleEventId)}`
      : `/calendars/${encodeURIComponent(integration.googleCalendarId)}/events`;
    let event: { id: string };
    try {
      event = await googleRequest<{ id: string }>(integration, path, {
        method: appointment.googleEventId ? "PATCH" : "POST",
        body,
      });
    } catch (error) {
      if (!appointment.googleEventId || !isMissingGoogleEvent(error)) {
        throw error;
      }
      event = await googleRequest<{ id: string }>(
        integration,
        `/calendars/${encodeURIComponent(integration.googleCalendarId)}/events`,
        { method: "POST", body },
      );
    }
    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          googleCalendarId: integration.googleCalendarId,
          googleEventId: event.id,
          calendarSyncStatus: "SYNCED",
          calendarSyncError: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          clinicId: appointment.clinicId,
          userId: appointment.dentistId,
          action: "GOOGLE_CALENDAR_SYNCED",
          entityType: "Appointment",
          entityId: appointment.id,
        },
      }),
    ]);
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 100) : "GOOGLE_CALENDAR_FAILED";
    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointment.id },
        data: { calendarSyncStatus: "FAILED", calendarSyncError: code },
      }),
      prisma.auditLog.create({
        data: {
          clinicId: appointment.clinicId,
          userId: appointment.dentistId,
          action: "GOOGLE_CALENDAR_SYNC_FAILED",
          entityType: "Appointment",
          entityId: appointment.id,
        },
      }),
    ]);
  }
}

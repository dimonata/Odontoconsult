import { z } from "zod";
import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { listGoogleCalendars } from "@/services/google-calendar";
import { requirePremiumAccess } from "@/lib/subscription";

export async function GET() {
  return apiHandler(async () => {
    const context = await requireApiContext();
    await requirePremiumAccess(context.clinicId);
    try {
      const result = await listGoogleCalendars(context.clinicId, context.userId);
      if (!result) return { connected: false, calendars: [] };
      return {
        connected: true,
        selectedCalendarId: result.integration.googleCalendarId,
        calendars: result.calendars,
      };
    } catch {
      return { connected: true, needsReconnect: true, calendars: [] };
    }
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    await requirePremiumAccess(context.clinicId);
    const input = z
      .object({ calendarId: z.string().min(1), calendarName: z.string().min(1).max(200) })
      .parse(await readJson(request));
    const integration = await prisma.calendarIntegration.findUnique({
      where: { clinicId_userId: { clinicId: context.clinicId, userId: context.userId } },
      select: { id: true, revokedAt: true },
    });
    if (!integration || integration.revokedAt)
      throw new AppError(409, "Conecte o Google Calendar primeiro.", "CALENDAR_NOT_CONNECTED");
    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { googleCalendarId: input.calendarId, googleCalendarName: input.calendarName },
    });
    return { ok: true };
  });
}

export async function DELETE() {
  return apiHandler(async () => {
    const context = await requireApiContext();
    await prisma.calendarIntegration.updateMany({
      where: { clinicId: context.clinicId, userId: context.userId },
      data: {
        revokedAt: new Date(),
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        accessTokenExpiresAt: null,
      },
    });
    return { ok: true };
  });
}

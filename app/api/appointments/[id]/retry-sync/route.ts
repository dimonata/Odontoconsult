import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requirePremiumAccess } from "@/lib/subscription";
import { syncAppointmentToGoogle } from "@/services/google-calendar";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/appointments/[id]/retry-sync">,
) {
  return apiHandler(async () => {
    const authContext = await requireApiContext();
    await requirePremiumAccess(authContext.clinicId);
    const { id } = await context.params;
    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId: authContext.clinicId },
      select: { id: true },
    });
    if (!appointment) throw new AppError(404, "Consulta não encontrada.", "APPOINTMENT_NOT_FOUND");
    await syncAppointmentToGoogle(appointment.id);
    return {
      appointment: await prisma.appointment.findUnique({
        where: { id: appointment.id },
        select: { calendarSyncStatus: true, calendarSyncError: true },
      }),
    };
  });
}

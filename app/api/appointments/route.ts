import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { AppError } from "@/lib/errors";
import { appointmentSchema } from "@/schemas/appointment";
import { createAppointment, listAppointments } from "@/services/appointments";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const url = new URL(request.url);
    const from = new Date(url.searchParams.get("from") ?? "");
    const to = new Date(url.searchParams.get("to") ?? "");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new AppError(422, "Intervalo de agenda inválido.", "INVALID_RANGE");
    }
    const appointments = await listAppointments(context, {
      from,
      to,
      patientId: url.searchParams.get("patientId") ?? undefined,
    });
    return { appointments };
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const input = appointmentSchema.parse(await readJson(request));
    return { appointment: await createAppointment(context, input) };
  });
}

import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { appointmentUpdateSchema } from "@/schemas/appointment";
import { getAppointment, updateAppointment } from "@/services/appointments";

export async function GET(_request: Request, context: RouteContext<"/api/appointments/[id]">) {
  return apiHandler(async () => {
    const authContext = await requireApiContext();
    const { id } = await context.params;
    return { appointment: await getAppointment(authContext, id) };
  });
}

export async function PATCH(request: Request, context: RouteContext<"/api/appointments/[id]">) {
  return apiHandler(async () => {
    const authContext = await requireApiContext();
    const { id } = await context.params;
    const input = appointmentUpdateSchema.parse(await readJson(request));
    return { appointment: await updateAppointment(authContext, id, input) };
  });
}

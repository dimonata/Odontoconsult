import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { getPatient } from "@/services/patients";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const { id } = await params;
    const patient = await getPatient(context, id);
    return { items: patient.procedures };
  });
}

import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { patientQuerySchema } from "@/schemas/patient";
import { listPatients } from "@/services/patients";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const url = new URL(request.url);
    const query = patientQuerySchema.parse({
      q: url.searchParams.get("q") ?? "",
      page: 1,
      pageSize: 8,
    });
    const result = await listPatients(context, query);
    return { items: result.items };
  });
}

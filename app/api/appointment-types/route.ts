import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";

export async function GET() {
  return apiHandler(async () => {
    const context = await requireApiContext();
    return {
      appointmentTypes: await prisma.appointmentType.findMany({
        where: { clinicId: context.clinicId, active: true },
        orderBy: { name: "asc" },
      }),
    };
  });
}

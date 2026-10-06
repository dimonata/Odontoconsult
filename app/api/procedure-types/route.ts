import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";

export async function GET() {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const items = await prisma.procedureType.findMany({
      where: { clinicId: context.clinicId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return { items };
  });
}

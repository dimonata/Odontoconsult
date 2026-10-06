import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { clinicSchema } from "@/schemas/profile";

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    if (context.role !== "OWNER")
      throw new AppError(403, "Apenas o proprietário pode alterar o consultório.", "FORBIDDEN");
    const input = clinicSchema.parse(await readJson(request));
    const clinic = await prisma.clinic.update({
      where: { id: context.clinicId },
      data: {
        name: input.name,
        timezone: input.timezone,
        confirmationLeadMinutes: input.confirmationLeadMinutes,
      },
      select: { id: true, name: true, timezone: true, confirmationLeadMinutes: true },
    });
    return { clinic };
  });
}

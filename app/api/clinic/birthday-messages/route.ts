import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { z } from "zod";

const schema = z.object({ enabled: z.boolean() });

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    if (context.role !== "OWNER") {
      throw new AppError(403, "Apenas o proprietário pode alterar as mensagens automáticas.", "FORBIDDEN");
    }
    const { enabled } = schema.parse(await readJson(request));
    const clinic = await prisma.clinic.update({
      where: { id: context.clinicId },
      data: { birthdayMessagesEnabled: enabled },
      select: { birthdayMessagesEnabled: true },
    });
    return { enabled: clinic.birthdayMessagesEnabled };
  });
}

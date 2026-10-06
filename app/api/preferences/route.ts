import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { preferenceSchema, workdayScheduleSchema } from "@/schemas/profile";

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const input = preferenceSchema.or(workdayScheduleSchema).parse(await readJson(request));
    const data =
      "theme" in input
        ? { theme: input.theme }
        : {
            workdayStartMinute: input.workdayStartMinute,
            workdayEndMinute: input.workdayEndMinute,
          };
    const preference = await prisma.userPreference.upsert({
      where: { userId: context.userId },
      create: { userId: context.userId, ...data },
      update: data,
      select: { theme: true, workdayStartMinute: true, workdayEndMinute: true },
    });
    return { preference };
  });
}

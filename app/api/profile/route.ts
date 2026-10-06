import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/schemas/profile";

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const input = profileSchema.parse(await readJson(request));
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: context.userId },
        data: { name: input.name },
        select: { id: true, name: true, email: true, image: true },
      });
      await writeAudit(tx, {
        clinicId: context.clinicId,
        userId: context.userId,
        action: "PROFILE_UPDATED",
        entityType: "User",
        entityId: context.userId,
      });
      return updated;
    });
    return { user };
  });
}

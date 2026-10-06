import { randomUUID } from "node:crypto";
import { requireApiContext } from "@/lib/auth-context";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  deletePrivateObject,
  getPrivateDownloadUrl,
  putPrivateObject,
  validateUpload,
} from "@/lib/storage";

export async function GET() {
  const context = await requireApiContext().catch(() => null);
  if (!context) return Response.json({ error: "Não autorizado." }, { status: 401 });
  if (!context.user.customImageKey)
    return Response.json({ error: "Foto não encontrada." }, { status: 404 });
  const url = await getPrivateDownloadUrl(context.user.customImageKey, "perfil.jpg", true);
  return Response.redirect(url, 302);
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(422, "Selecione uma imagem.", "FILE_REQUIRED");
    const validated = await validateUpload(file, true);
    const key = `clinics/${context.clinicId}/users/${context.userId}/profile/${randomUUID()}.${validated.extension}`;
    await putPrivateObject({ key, body: validated.buffer, mimeType: validated.mimeType });
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: context.userId }, data: { customImageKey: key } });
        await writeProfileAudit(tx, context.clinicId, context.userId);
      });
    } catch (error) {
      await deletePrivateObject(key).catch(() => undefined);
      throw error;
    }
    if (context.user.customImageKey)
      await deletePrivateObject(context.user.customImageKey).catch(() => undefined);
    return { imageUrl: "/api/profile/photo" };
  });
}

function writeProfileAudit(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  clinicId: string,
  userId: string,
) {
  return tx.auditLog.create({
    data: { clinicId, userId, action: "PROFILE_UPDATED", entityType: "User", entityId: userId },
  });
}

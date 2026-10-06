import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getPrivateDownloadUrl, getPrivateInlineObject } from "@/lib/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext().catch(() => null);
  if (!context) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const file = await prisma.patientFile.findFirst({
    where: { id, clinicId: context.clinicId, deletedAt: null },
    select: { storageKey: true, originalName: true, mimeType: true },
  });
  if (!file) return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  if (inline) {
    const object = await getPrivateInlineObject(file.storageKey).catch(() => null);
    if (!object)
      return Response.json({ error: "Falha ao acessar o armazenamento." }, { status: 503 });
    return new Response(object.body, {
      headers: {
        "Content-Type": object.contentType ?? file.mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Cookie",
      },
    });
  }
  const url = await getPrivateDownloadUrl(file.storageKey, file.originalName, inline).catch(
    () => null,
  );
  if (!url) return Response.json({ error: "Falha ao acessar o armazenamento." }, { status: 503 });
  // A URL assinada expira em 60 segundos. Nunca deixe o navegador reutilizar um redirect antigo.
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const { id } = await params;
    const file = await prisma.patientFile.findFirst({
      where: { id, clinicId: context.clinicId, deletedAt: null },
      select: { id: true },
    });
    if (!file) throw new AppError(404, "Arquivo não encontrado.", "FILE_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.patient.updateMany({
        where: { clinicId: context.clinicId, photoFileId: file.id },
        data: { photoFileId: null },
      });
      await tx.patientFile.update({ where: { id: file.id }, data: { deletedAt: new Date() } });
      await writeAudit(tx, {
        clinicId: context.clinicId,
        userId: context.userId,
        action: "FILE_DELETED",
        entityType: "PatientFile",
        entityId: file.id,
      });
    });

    return { success: true };
  });
}

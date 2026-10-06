import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { deletePrivateObject, putPrivateObject, validateUpload } from "@/lib/storage";

const categorySchema = z.enum(["RADIOGRAPH", "PHOTOGRAPH", "DOCUMENT", "EXAM", "OTHER"]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const { id: patientId } = await params;
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: context.clinicId, archivedAt: null },
      select: { id: true },
    });
    if (!patient) throw new AppError(404, "Paciente não encontrado.", "PATIENT_NOT_FOUND");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new AppError(422, "Selecione um arquivo.", "FILE_REQUIRED");
    const category = categorySchema.parse(formData.get("category"));
    const isProfilePhoto = formData.get("profilePhoto") === "true";
    const validated = await validateUpload(file, isProfilePhoto);
    const key = `clinics/${context.clinicId}/patients/${patient.id}/${randomUUID()}.${validated.extension}`;

    await putPrivateObject({ key, body: validated.buffer, mimeType: validated.mimeType });
    try {
      const stored = await prisma.$transaction(async (tx) => {
        const created = await tx.patientFile.create({
          data: {
            clinicId: context.clinicId,
            patientId: patient.id,
            originalName: file.name.slice(0, 255),
            storageKey: key,
            mimeType: validated.mimeType,
            sizeBytes: file.size,
            category,
            uploadedById: context.userId,
          },
          select: { id: true, originalName: true, mimeType: true, sizeBytes: true, category: true },
        });
        if (isProfilePhoto) {
          await tx.patient.update({ where: { id: patient.id }, data: { photoFileId: created.id } });
        }
        await writeAudit(tx, {
          clinicId: context.clinicId,
          userId: context.userId,
          action: "FILE_UPLOADED",
          entityType: "PatientFile",
          entityId: created.id,
        });
        return created;
      });
      return { file: { ...stored, viewUrl: `/api/files/${stored.id}?inline=1` } };
    } catch (error) {
      await deletePrivateObject(key).catch(() => undefined);
      throw error;
    }
  });
}

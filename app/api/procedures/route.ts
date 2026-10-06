import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { civilDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requirePremiumAccess } from "@/lib/subscription";
import { procedureSchema } from "@/schemas/procedure";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    await requirePremiumAccess(context.clinicId);
    const input = procedureSchema.parse(await readJson(request));
    const [patient, procedureType] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: input.patientId, clinicId: context.clinicId, archivedAt: null },
        select: { id: true },
      }),
      prisma.procedureType.findFirst({
        where: { id: input.procedureTypeId, clinicId: context.clinicId, active: true },
        select: { id: true },
      }),
    ]);
    if (!patient) throw new AppError(404, "Paciente não encontrado.", "PATIENT_NOT_FOUND");
    if (!procedureType)
      throw new AppError(404, "Tipo de serviço não encontrado.", "PROCEDURE_TYPE_NOT_FOUND");

    const procedure = await prisma.$transaction(async (tx) => {
      const created = await tx.procedure.create({
        data: {
          clinicId: context.clinicId,
          patientId: patient.id,
          procedureTypeId: procedureType.id,
          performedAt: civilDate(input.performedAt),
          chargedAmountCents: BigInt(input.chargedAmountCents),
          costCents: BigInt(input.costCents),
          description: input.description || null,
          createdById: context.userId,
          teeth: { create: input.teeth.map((toothNumber) => ({ toothNumber })) },
        },
        select: { id: true },
      });
      await writeAudit(tx, {
        clinicId: context.clinicId,
        userId: context.userId,
        action: "PROCEDURE_CREATED",
        entityType: "Procedure",
        entityId: created.id,
      });
      return created;
    });

    return { procedure };
  });
}

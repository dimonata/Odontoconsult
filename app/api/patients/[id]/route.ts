import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { civilDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { assertFound } from "@/lib/errors";
import { formatCpf, formatPhone, onlyDigits } from "@/lib/normalizers";
import { patientUpdateSchema } from "@/schemas/patient";
import { getPatient } from "@/services/patients";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const { id } = await params;
    return { patient: await getPatient(context, id) };
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const { id } = await params;
    const input = patientUpdateSchema.parse(await readJson(request));
    const existing = assertFound(
      await prisma.patient.findFirst({
        where: { id, clinicId: context.clinicId, archivedAt: null },
        select: { id: true },
      }),
      "Paciente não encontrado.",
    );

    await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: existing.id },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.cpf !== undefined
            ? { cpf: formatCpf(input.cpf), cpfNormalized: onlyDigits(input.cpf) }
            : {}),
          ...(input.phone !== undefined
            ? { phone: formatPhone(input.phone), phoneNormalized: onlyDigits(input.phone) }
            : {}),
          ...(input.birthDate !== undefined ? { birthDate: civilDate(input.birthDate) } : {}),
          ...(input.whatsappOptIn !== undefined ? { whatsappOptIn: input.whatsappOptIn } : {}),
          ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        },
      });
      await writeAudit(tx, {
        clinicId: context.clinicId,
        userId: context.userId,
        action: "PATIENT_UPDATED",
        entityType: "Patient",
        entityId: id,
      });
    });

    return { patient: await getPatient(context, id) };
  });
}

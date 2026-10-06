import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { civilDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatCpf, formatPhone, onlyDigits } from "@/lib/normalizers";
import { patientQuerySchema, patientSchema } from "@/schemas/patient";
import { listPatients } from "@/services/patients";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const url = new URL(request.url);
    const query = patientQuerySchema.parse(Object.fromEntries(url.searchParams));
    return listPatients(context, query);
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const input = patientSchema.parse(await readJson(request));
    const cpfNormalized = onlyDigits(input.cpf);
    const phoneNormalized = onlyDigits(input.phone);

    const patient = await prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          clinicId: context.clinicId,
          fullName: input.fullName,
          cpf: formatCpf(cpfNormalized),
          cpfNormalized,
          phone: formatPhone(phoneNormalized),
          phoneNormalized,
          birthDate: civilDate(input.birthDate),
          whatsappOptIn: input.whatsappOptIn,
          notes: input.notes || null,
        },
        select: { id: true, fullName: true },
      });
      await writeAudit(tx, {
        clinicId: context.clinicId,
        userId: context.userId,
        action: "PATIENT_CREATED",
        entityType: "Patient",
        entityId: created.id,
      });
      return created;
    });

    return { patient };
  });
}

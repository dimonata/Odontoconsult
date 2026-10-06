import "server-only";

import type { AuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { assertFound } from "@/lib/errors";
import { onlyDigits } from "@/lib/normalizers";

export async function listPatients(
  context: AuthContext,
  input: { q: string; page: number; pageSize: number },
) {
  const query = input.q.trim();
  const digits = onlyDigits(query);
  const where = {
    clinicId: context.clinicId,
    archivedAt: null,
    ...(query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" as const } },
            ...(digits ? [{ cpfNormalized: { contains: digits } }] : []),
            ...(digits ? [{ phoneNormalized: { contains: digits } }] : []),
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.patient.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        fullName: true,
        cpf: true,
        phone: true,
        birthDate: true,
        createdAt: true,
        photoFileId: true,
        _count: { select: { procedures: true, files: true } },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      birthDate: item.birthDate.toISOString().slice(0, 10),
      createdAt: item.createdAt.toISOString(),
      photoUrl: item.photoFileId ? `/api/files/${item.photoFileId}?inline=1` : null,
    })),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
  };
}

export async function getPatient(context: AuthContext, patientId: string) {
  const patient = assertFound(
    await prisma.patient.findFirst({
      where: { id: patientId, clinicId: context.clinicId, archivedAt: null },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        phone: true,
        birthDate: true,
        whatsappOptIn: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        photoFileId: true,
        clinic: { select: { timezone: true } },
        procedures: {
          where: { deletedAt: null },
          orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            performedAt: true,
            chargedAmountCents: true,
            costCents: true,
            description: true,
            procedureType: { select: { id: true, name: true } },
            teeth: { select: { toothNumber: true }, orderBy: { toothNumber: "asc" } },
          },
        },
        files: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            category: true,
            createdAt: true,
          },
        },
        appointments: {
          orderBy: { startAt: "desc" },
          select: {
            id: true,
            startAt: true,
            endAt: true,
            status: true,
            dentist: { select: { name: true } },
            appointmentType: { select: { name: true, color: true } },
          },
        },
      },
    }),
    "Paciente não encontrado.",
  );

  return {
    ...patient,
    birthDate: patient.birthDate.toISOString().slice(0, 10),
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
    photoUrl: patient.photoFileId ? `/api/files/${patient.photoFileId}?inline=1` : null,
    timezone: patient.clinic.timezone,
    procedures: patient.procedures.map((procedure) => ({
      ...procedure,
      performedAt: procedure.performedAt.toISOString().slice(0, 10),
      chargedAmountCents: Number(procedure.chargedAmountCents),
      costCents: Number(procedure.costCents),
      profitCents: Number(procedure.chargedAmountCents - procedure.costCents),
      teeth: procedure.teeth.map(({ toothNumber }) => toothNumber),
    })),
    files: patient.files.map((file) => ({
      ...file,
      createdAt: file.createdAt.toISOString(),
      viewUrl: `/api/files/${file.id}?inline=1`,
      downloadUrl: `/api/files/${file.id}`,
    })),
    appointments: patient.appointments.map((appointment) => ({
      ...appointment,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      isUpcoming:
        ["SCHEDULED", "CONFIRMATION_PENDING", "CONFIRMED"].includes(appointment.status) &&
        appointment.endAt.getTime() >= Date.now(),
    })),
  };
}

"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { clinicSchema } from "@/schemas/profile";

export type OnboardingState = { error?: string } | undefined;

const defaultProcedureTypes = [
  "Implante",
  "Limpeza",
  "Tratamento de canal",
  "Extração dentária",
  "Consulta/Avaliação",
  "Restauração",
];

const defaultAppointmentTypes = [
  ["Consulta/Avaliação", "#087f8c", 60],
  ["Limpeza", "#17815b", 45],
  ["Implante", "#7c3aed", 90],
  ["Canal", "#2563eb", 90],
  ["Extração", "#c43f4c", 60],
  ["Retorno", "#ca8a04", 30],
  ["Outro", "#64748b", 60],
] as const;

export async function completeOnboarding(
  _state: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sua sessão expirou. Entre novamente." };
  const parsed = clinicSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  const existing = await prisma.clinicMember.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (!existing) {
    await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({ data: { name: parsed.data.name } });
      await tx.clinicMember.create({
        data: { clinicId: clinic.id, userId: session.user.id, role: "OWNER", status: "ACTIVE" },
      });
      await tx.procedureType.createMany({
        data: defaultProcedureTypes.map((name) => ({ clinicId: clinic.id, name })),
      });
      await tx.appointmentType.createMany({
        data: defaultAppointmentTypes.map(([name, color, defaultMinutes]) => ({
          clinicId: clinic.id,
          name,
          color,
          defaultMinutes,
        })),
      });
      await tx.userPreference.create({ data: { userId: session.user.id, theme: "SYSTEM" } });
      await tx.auditLog.create({
        data: {
          clinicId: clinic.id,
          userId: session.user.id,
          action: "CLINIC_CREATED",
          entityType: "Clinic",
          entityId: clinic.id,
        },
      });
    });
  }
  redirect("/dashboard");
}

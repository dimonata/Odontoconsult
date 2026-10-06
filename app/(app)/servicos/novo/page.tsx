import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProcedureForm } from "@/components/procedure-form";
import { requirePageContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";

export const metadata = { title: "Registrar serviço" };

export default async function NewProcedurePage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const context = await requirePageContext();
  const { patientId } = await searchParams;
  const [types, initialPatient, subscription] = await Promise.all([
    prisma.procedureType.findMany({
      where: { clinicId: context.clinicId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    patientId
      ? prisma.patient.findFirst({
          where: { id: patientId, clinicId: context.clinicId, archivedAt: null },
          select: { id: true, fullName: true, cpf: true, phone: true },
        })
      : null,
    prisma.subscription.findUnique({
      where: { clinicId: context.clinicId },
      select: { status: true },
    }),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={initialPatient ? `/pacientes/${initialPatient.id}` : "/dashboard"}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>
      <div className="mb-6">
        <p className="eyebrow">Atendimento</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Registrar serviço</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Associe o procedimento ao paciente, aos dentes e aos valores financeiros.
        </p>
      </div>
      <ProcedureForm
        types={types}
        initialPatient={initialPatient ?? undefined}
        premium={subscription?.status === "AUTHORIZED"}
      />
    </div>
  );
}

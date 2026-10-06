import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppointmentForm } from "@/components/appointment-form";
import { requirePageContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { clinicToday } from "@/lib/timezone";

export const metadata = { title: "Nova consulta" };

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; date?: string; time?: string }>;
}) {
  const context = await requirePageContext();
  const search = await searchParams;
  const [clinic, patients, appointmentTypes, members] = await Promise.all([
    prisma.clinic.findUniqueOrThrow({
      where: { id: context.clinicId },
      select: { timezone: true },
    }),
    prisma.patient.findMany({
      where: { clinicId: context.clinicId, archivedAt: null },
      select: { id: true, fullName: true, cpf: true, phone: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
    prisma.appointmentType.findMany({
      where: { clinicId: context.clinicId, active: true },
      select: { id: true, name: true, defaultMinutes: true },
      orderBy: { name: "asc" },
    }),
    prisma.clinicMember.findMany({
      where: { clinicId: context.clinicId, status: "ACTIVE", role: { in: ["OWNER", "DENTIST"] } },
      select: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/agenda"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft className="size-4" /> Voltar para agenda
      </Link>
      <div className="mb-6">
        <p className="eyebrow">Agenda clínica</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Nova consulta</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          O sistema verificará conflitos antes de salvar.
        </p>
      </div>
      <AppointmentForm
        patients={patients}
        appointmentTypes={appointmentTypes}
        dentists={members.map(({ user }) => user)}
        initial={{
          patientId: search.patientId,
          date: /^\d{4}-\d{2}-\d{2}$/.test(search.date ?? "")
            ? search.date!
            : clinicToday(clinic.timezone),
          time: /^\d{2}:\d{2}$/.test(search.time ?? "") ? search.time! : "09:00",
          dentistId: members.some(({ user }) => user.id === context.userId)
            ? context.userId
            : (members[0]?.user.id ?? ""),
        }}
      />
    </div>
  );
}

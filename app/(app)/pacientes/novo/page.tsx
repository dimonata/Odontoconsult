import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PatientForm } from "@/components/patient-form";

export const metadata = { title: "Cadastrar paciente" };

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const safeReturnTo = ["/servicos/novo", "/agenda/novo"].includes(returnTo ?? "")
    ? returnTo
    : undefined;
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={safeReturnTo ?? "/pacientes"}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>
      <div className="mb-6">
        <p className="eyebrow">Novo prontuário</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Cadastrar paciente</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Campos marcados com * são obrigatórios.
        </p>
      </div>
      <PatientForm returnTo={safeReturnTo} />
    </div>
  );
}

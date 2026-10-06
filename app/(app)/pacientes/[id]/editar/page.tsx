import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { requirePageContext } from "@/lib/auth-context";
import { getPatient } from "@/services/patients";

export const metadata = { title: "Editar paciente" };

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePageContext();
  const { id } = await params;
  const patient = await getPatient(context, id);
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/pacientes/${id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft className="size-4" />
        Voltar para ficha
      </Link>
      <div className="mb-6">
        <p className="eyebrow">Prontuário</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Editar paciente</h1>
      </div>
      <PatientForm initial={patient} />
    </div>
  );
}

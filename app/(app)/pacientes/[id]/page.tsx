import Link from "next/link";
import { ArrowLeft, Cake, FilePlus2, Pencil, Phone, UserRound } from "lucide-react";
import { PatientDetails } from "@/components/patient-details";
import { requirePageContext } from "@/lib/auth-context";
import { ageFromBirthDate, civilDate, formatDateBr } from "@/lib/dates";
import { getPatient } from "@/services/patients";

export const metadata = { title: "Ficha do paciente" };

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePageContext();
  const { id } = await params;
  const patient = await getPatient(context, id);
  const age = ageFromBirthDate(civilDate(patient.birthDate));
  return (
    <div className="space-y-6">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-2 text-sm font-medium"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft className="size-4" />
        Voltar para pacientes
      </Link>
      <header className="card flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div
            className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            {patient.photoUrl ? (
              <img
                src={patient.photoUrl}
                alt={`Foto de ${patient.fullName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="size-8" />
            )}
          </div>
          <div>
            <p className="eyebrow">Ficha do paciente</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {patient.fullName}
            </h1>
            <div
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
              style={{ color: "var(--muted)" }}
            >
              <span>{patient.cpf}</span>
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {patient.phone}
              </span>
              <span className="flex items-center gap-1">
                <Cake className="size-3" />
                {age} anos · {formatDateBr(patient.birthDate)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/pacientes/${id}/editar`} className="btn-secondary">
            <Pencil className="size-4" />
            Editar paciente
          </Link>
          <Link href={`/servicos/novo?patientId=${id}`} className="btn-primary">
            <FilePlus2 className="size-4" />
            Registrar serviço
          </Link>
        </div>
      </header>
      <PatientDetails patient={patient} />
    </div>
  );
}

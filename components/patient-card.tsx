import Link from "next/link";
import { ChevronRight, FileText, Stethoscope } from "lucide-react";

type PatientCardProps = {
  patient: {
    id: string;
    fullName: string;
    cpf: string;
    phone: string;
    photoUrl: string | null;
    _count: { procedures: number; files: number };
  };
};

export function PatientCard({ patient }: PatientCardProps) {
  return (
    <Link
      href={`/pacientes/${patient.id}`}
      className="card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]"
    >
      <div
        className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold"
        style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
      >
        {patient.photoUrl ? (
          <img
            src={patient.photoUrl}
            alt={`Foto de ${patient.fullName}`}
            className="h-full w-full object-cover"
          />
        ) : (
          patient.fullName
            .split(" ")
            .slice(0, 2)
            .map((item) => item[0])
            .join("")
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold">{patient.fullName}</h2>
        <p className="mt-0.5 truncate text-xs" style={{ color: "var(--muted)" }}>
          {patient.cpf} · {patient.phone}
        </p>
        <div className="mt-2 flex gap-3 text-xs" style={{ color: "var(--muted)" }}>
          <span className="flex items-center gap-1">
            <Stethoscope className="size-3.5" />
            {patient._count.procedures} serviços
          </span>
          <span className="flex items-center gap-1">
            <FileText className="size-3.5" />
            {patient._count.files} arquivos
          </span>
        </div>
      </div>
      <ChevronRight
        className="size-5 shrink-0 transition group-hover:translate-x-1"
        style={{ color: "var(--muted)" }}
      />
    </Link>
  );
}

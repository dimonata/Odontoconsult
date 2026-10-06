import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, UserPlus, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PatientCard } from "@/components/patient-card";
import { requirePageContext } from "@/lib/auth-context";
import { patientQuerySchema } from "@/schemas/patient";
import { listPatients } from "@/services/patients";

export const metadata = { title: "Pacientes" };

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const context = await requirePageContext();
  const raw = await searchParams;
  const query = patientQuerySchema.parse({ q: raw.q, page: raw.page, pageSize: 20 });
  const result = await listPatients(context, query);
  const pageLink = (page: number) =>
    `/pacientes?${new URLSearchParams({ ...(query.q ? { q: query.q } : {}), page: String(page) })}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Prontuários</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            {result.pagination.total} paciente(s) cadastrado(s)
          </p>
        </div>
        <Link href="/pacientes/novo" className="btn-primary">
          <UserPlus className="size-4" />
          Cadastrar paciente
        </Link>
      </div>
      <form className="card flex gap-2 p-3" method="get">
        <label className="relative flex-1">
          <span className="sr-only">Pesquisar paciente</span>
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            className="input pl-10"
            name="q"
            defaultValue={query.q}
            placeholder="Pesquisar por nome, CPF ou telefone..."
          />
        </label>
        <button className="btn-secondary" type="submit">
          Pesquisar
        </button>
      </form>
      {result.items.length ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {result.items.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
          <nav className="flex items-center justify-between" aria-label="Paginação">
            <Link
              href={pageLink(Math.max(1, query.page - 1))}
              aria-disabled={query.page <= 1}
              className={`btn-secondary ${query.page <= 1 ? "pointer-events-none opacity-45" : ""}`}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Link>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              Página {query.page} de {result.pagination.pages}
            </span>
            <Link
              href={pageLink(Math.min(result.pagination.pages, query.page + 1))}
              aria-disabled={query.page >= result.pagination.pages}
              className={`btn-secondary ${query.page >= result.pagination.pages ? "pointer-events-none opacity-45" : ""}`}
            >
              Próxima
              <ChevronRight className="size-4" />
            </Link>
          </nav>
        </>
      ) : (
        <div className="card">
          <EmptyState
            icon={UsersRound}
            title={
              query.q ? "Nenhum paciente encontrado" : "Você ainda não possui pacientes cadastrados"
            }
            description={
              query.q
                ? "Tente pesquisar usando outro nome, CPF ou telefone."
                : "Cadastre o primeiro paciente para começar a registrar procedimentos e documentos."
            }
            actionLabel={query.q ? undefined : "Cadastrar primeiro paciente"}
            actionHref={query.q ? undefined : "/pacientes/novo"}
          />
        </div>
      )}
    </div>
  );
}

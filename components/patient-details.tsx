"use client";

import { useState } from "react";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { FileUploadPanel } from "@/components/file-upload-panel";
import { Odontogram } from "@/components/odontogram";
import { formatDateBr } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { AppointmentStatusBadge } from "@/components/appointment-status-badge";
import type { AppointmentStatusKey } from "@/lib/appointment-ui";
import Link from "next/link";

type Procedure = {
  id: string;
  performedAt: string;
  chargedAmountCents: number;
  costCents: number;
  profitCents: number;
  description: string | null;
  procedureType: { id: string; name: string };
  teeth: number[];
};
type PatientFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  createdAt: string;
  viewUrl: string;
  downloadUrl: string;
};
export type PatientDetailsData = {
  id: string;
  fullName: string;
  notes: string | null;
  procedures: Procedure[];
  files: PatientFile[];
  timezone: string;
  appointments: Array<{
    id: string;
    startAt: string;
    endAt: string;
    isUpcoming: boolean;
    status: AppointmentStatusKey;
    dentist: { name: string | null };
    appointmentType: { name: string; color: string };
  }>;
};

type PatientAppointment = PatientDetailsData["appointments"][number];

function AppointmentRows({ items, timezone }: { items: PatientAppointment[]; timezone: string }) {
  return (
    <div className="divide-y">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/agenda/${item.id}`}
          className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-xl"
              style={{
                background: "var(--primary-soft)",
                color: item.appointmentType.color,
              }}
            >
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{item.appointmentType.name}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                {new Date(item.startAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: timezone,
                })}{" "}
                · {item.dentist.name ?? "Dentista"}
              </p>
            </div>
          </div>
          <AppointmentStatusBadge status={item.status} />
        </Link>
      ))}
    </div>
  );
}

const tabs = [
  { id: "overview", label: "Visão geral" },
  { id: "services", label: "Serviços" },
  { id: "appointments", label: "Agendamentos" },
  { id: "files", label: "Arquivos" },
  { id: "odontogram", label: "Odontograma" },
] as const;

export function PatientDetails({ patient }: { patient: PatientDetailsData }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("overview");
  const [selectedTooth, setSelectedTooth] = useState<number[]>([]);
  const historyTeeth = [...new Set(patient.procedures.flatMap((item) => item.teeth))];
  const toothProcedures = selectedTooth.length
    ? patient.procedures.filter((item) => item.teeth.includes(selectedTooth[0]))
    : [];
  const upcomingAppointments = patient.appointments
    .filter((item) => item.isUpcoming)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const upcomingIds = new Set(upcomingAppointments.map((item) => item.id));
  const appointmentHistory = patient.appointments.filter((item) => !upcomingIds.has(item.id));
  async function removeFile(file: PatientFile) {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o arquivo “${file.originalName}”? O registro ficará retido para auditoria.`,
      )
    )
      return;
    const response = await fetch(`/api/files/${file.id}`, { method: "DELETE" });
    if (response.ok) {
      toast.success("Arquivo removido da ficha.");
      router.refresh();
    } else {
      const data = (await response.json()) as { error?: string };
      toast.error(data.error ?? "Não foi possível excluir o arquivo.");
    }
  }
  return (
    <div>
      <div className="mb-5 overflow-x-auto">
        <div className="inline-flex min-w-max rounded-xl border p-1" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className="rounded-lg px-4 py-2 text-sm font-medium transition"
              style={
                tab === item.id
                  ? { background: "var(--primary-soft)", color: "var(--primary)" }
                  : { color: "var(--muted)" }
              }
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <h2 className="font-semibold">Observações</h2>
            <p
              className="mt-3 whitespace-pre-wrap text-sm leading-7"
              style={{ color: patient.notes ? "var(--foreground)" : "var(--muted)" }}
            >
              {patient.notes || "Nenhuma observação registrada."}
            </p>
          </section>
          <section className="card">
            <h2 className="font-semibold">Resumo clínico</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: "var(--muted)" }}>Procedimentos</dt>
                <dd className="font-semibold">{patient.procedures.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--muted)" }}>Arquivos</dt>
                <dd className="font-semibold">{patient.files.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--muted)" }}>Dentes tratados</dt>
                <dd className="font-semibold">{historyTeeth.length}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
      {tab === "services" && (
        <section className="card">
          {patient.procedures.length ? (
            <div className="relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-[var(--border)]">
              {patient.procedures.map((item) => (
                <article key={item.id} className="relative pl-8">
                  <span
                    className="absolute top-1 left-0 size-[15px] rounded-full border-4"
                    style={{ background: "var(--primary)", borderColor: "var(--surface)" }}
                  />
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {formatDateBr(item.performedAt)}
                      </p>
                      <h2 className="mt-1 font-semibold">{item.procedureType.name}</h2>
                      {item.teeth.length > 0 && (
                        <p className="mt-1 text-xs" style={{ color: "var(--primary)" }}>
                          Dentes: {item.teeth.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-right text-xs">
                      <div>
                        <p style={{ color: "var(--muted)" }}>Valor</p>
                        <p className="mt-1 font-semibold">
                          {formatCurrency(item.chargedAmountCents)}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: "var(--muted)" }}>Custo</p>
                        <p className="mt-1 font-semibold">{formatCurrency(item.costCents)}</p>
                      </div>
                      <div>
                        <p style={{ color: "var(--muted)" }}>Lucro</p>
                        <p className="mt-1 font-semibold" style={{ color: "var(--success)" }}>
                          {formatCurrency(item.profitCents)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {item.description && (
                    <p
                      className="mt-3 rounded-lg p-3 text-sm leading-6"
                      style={{ background: "var(--surface-muted)", color: "var(--muted)" }}
                    >
                      {item.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Stethoscope}
              title="Nenhum serviço registrado"
              description="Registre o primeiro procedimento deste paciente."
              actionLabel="Registrar serviço"
              actionHref={`/servicos/novo?patientId=${patient.id}`}
            />
          )}
        </section>
      )}
      {tab === "files" && (
        <section className="space-y-5">
          <div className="card">
            <h2 className="mb-4 font-semibold">Adicionar arquivo</h2>
            <FileUploadPanel patientId={patient.id} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {patient.files.map((file) => (
              <article key={file.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                  >
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold" title={file.originalName}>
                      {file.originalName}
                    </h3>
                    <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                      {file.category} · {(file.sizeBytes / 1024).toFixed(0)} KB
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a
                    href={file.viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary min-h-9 flex-1 px-2"
                  >
                    <ExternalLink className="size-3.5" />
                    Abrir
                  </a>
                  <a
                    href={file.downloadUrl}
                    className="btn-secondary min-h-9 px-2"
                    aria-label={`Baixar ${file.originalName}`}
                  >
                    <Download className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    className="btn-secondary min-h-9 px-2"
                    style={{ color: "var(--danger)" }}
                    onClick={() => void removeFile(file)}
                    aria-label={`Excluir ${file.originalName}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!patient.files.length && (
            <div className="card">
              <EmptyState
                icon={FolderOpen}
                title="Nenhum arquivo"
                description="Envie radiografias, fotografias, exames ou documentos do paciente."
              />
            </div>
          )}
        </section>
      )}
      {tab === "appointments" && (
        <section className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Consultas</h2>
            <Link href={`/agenda/novo?patientId=${patient.id}`} className="btn-primary">
              Nova consulta
            </Link>
          </div>
          {patient.appointments.length ? (
            <div className="space-y-7">
              <div>
                <h3 className="text-sm font-semibold">Próximas consultas</h3>
                {upcomingAppointments.length ? (
                  <AppointmentRows items={upcomingAppointments} timezone={patient.timezone} />
                ) : (
                  <p className="py-4 text-sm" style={{ color: "var(--muted)" }}>
                    Nenhuma consulta futura.
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold">Histórico</h3>
                {appointmentHistory.length ? (
                  <AppointmentRows items={appointmentHistory} timezone={patient.timezone} />
                ) : (
                  <p className="py-4 text-sm" style={{ color: "var(--muted)" }}>
                    Nenhuma consulta no histórico.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum agendamento"
              description="Crie a primeira consulta deste paciente."
              actionLabel="Nova consulta"
              actionHref={`/agenda/novo?patientId=${patient.id}`}
            />
          )}
        </section>
      )}
      {tab === "odontogram" && (
        <section className="card">
          <div className="mb-5">
            <h2 className="font-semibold">Histórico por dente</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Dentes destacados possuem procedimentos. Selecione um dente para ver o histórico.
            </p>
          </div>
          <Odontogram
            selected={selectedTooth}
            onChange={setSelectedTooth}
            historyTeeth={historyTeeth}
            single
          />
          {selectedTooth.length > 0 && (
            <div className="mt-6 rounded-xl border p-4">
              <h3 className="font-semibold">Dente {selectedTooth[0]}</h3>
              {toothProcedures.length ? (
                <div className="mt-3 divide-y">
                  {toothProcedures.map((item) => (
                    <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                      <span>
                        {formatDateBr(item.performedAt)} — {item.procedureType.name}
                      </span>
                      <span className="font-medium">{formatCurrency(item.chargedAmountCents)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                  Nenhum procedimento associado.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

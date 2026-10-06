"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Plus, Search, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Odontogram } from "@/components/odontogram";
import { formatCurrency, parseCurrencyInput } from "@/lib/money";

type PatientOption = { id: string; fullName: string; cpf: string; phone: string };
type ProcedureTypeOption = { id: string; name: string };
type Draft = {
  procedureTypeId: string;
  performedAt: string;
  charged: number;
  cost: number;
  description: string;
  teeth: number[];
};

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const emptyDraft: Draft = {
  procedureTypeId: "",
  performedAt: today(),
  charged: 0,
  cost: 0,
  description: "",
  teeth: [],
};

export function ProcedureForm({
  types,
  initialPatient,
  premium,
}: {
  types: ProcedureTypeOption[];
  initialPatient?: PatientOption;
  premium: boolean;
}) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientOption | undefined>(initialPatient);
  const [patientQuery, setPatientQuery] = useState("");
  const [results, setResults] = useState<PatientOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem("procedure-draft");
        if (stored) setDraft({ ...emptyDraft, ...(JSON.parse(stored) as Partial<Draft>) });
        const storedPatient = sessionStorage.getItem("procedure-patient");
        if (!initialPatient && storedPatient) {
          setPatient(JSON.parse(storedPatient) as PatientOption);
        }
      } catch {
        /* invalid local draft is ignored */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialPatient]);
  useEffect(() => {
    sessionStorage.setItem("procedure-draft", JSON.stringify(draft));
  }, [draft]);
  useEffect(() => {
    if (patient) sessionStorage.setItem("procedure-patient", JSON.stringify(patient));
    else sessionStorage.removeItem("procedure-patient");
  }, [patient]);
  useEffect(() => {
    if (patientQuery.trim().length < 2) return;
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/patients/search?q=${encodeURIComponent(patientQuery)}`, {
          signal: abort.signal,
        });
        const data = (await response.json()) as { items?: PatientOption[] };
        setResults(data.items ?? []);
      } catch {
        /* request replaced */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [patientQuery]);
  const profit = draft.charged - draft.cost;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!patient) {
      toast.error("Selecione um paciente.");
      return;
    }
    if (!draft.procedureTypeId) {
      toast.error("Selecione o tipo de serviço.");
      return;
    }
    setSaving(true);
    try {
      if (!premium) {
        sessionStorage.setItem("procedure-draft", JSON.stringify(draft));
        sessionStorage.setItem("procedure-patient", JSON.stringify(patient));
        const checkoutResponse = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returnPath: "/servicos/novo" }),
        });
        const checkout = (await checkoutResponse.json()) as {
          active?: boolean;
          checkoutUrl?: string | null;
          error?: string;
        };
        if (!checkoutResponse.ok) {
          throw new Error(checkout.error ?? "Não foi possível abrir o pagamento.");
        }
        if (checkout.active) {
          router.refresh();
          throw new Error("Assinatura atualizada. Clique novamente em Registrar serviço.");
        }
        if (!checkout.checkoutUrl) throw new Error("O Mercado Pago não retornou o checkout.");
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      const response = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          ...draft,
          chargedAmountCents: draft.charged,
          costCents: draft.cost,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Erro ao registrar serviço.");
      sessionStorage.removeItem("procedure-draft");
      sessionStorage.removeItem("procedure-patient");
      toast.success("Serviço registrado com sucesso.");
      router.push(`/pacientes/${patient.id}`);
      router.refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Erro ao registrar serviço.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="card">
        <h2 className="font-semibold">Paciente *</h2>
        {patient ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
              >
                <UserRound className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{patient.fullName}</p>
                <p className="truncate text-xs" style={{ color: "var(--muted)" }}>
                  {patient.cpf} · {patient.phone}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-lg"
              onClick={() => setPatient(undefined)}
              aria-label="Trocar paciente"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="relative mt-4">
            <div className="relative">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2"
                style={{ color: "var(--muted)" }}
              />
              <input
                className="input pl-10"
                value={patientQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setPatientQuery(value);
                  if (value.trim().length < 2) setResults([]);
                }}
                placeholder="Pesquisar por nome, CPF ou telefone..."
              />
              {searching && (
                <LoaderCircle className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
              )}
            </div>
            {patientQuery.length >= 2 && (
              <div className="mt-2 overflow-hidden rounded-xl border">
                {results.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setPatient(item);
                      setResults([]);
                      setPatientQuery("");
                    }}
                    className="flex w-full items-center justify-between border-b px-4 py-3 text-left last:border-0 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span>
                      <span className="block text-sm font-medium">{item.fullName}</span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {item.cpf} · {item.phone}
                      </span>
                    </span>
                    <Check className="size-4" style={{ color: "var(--primary)" }} />
                  </button>
                ))}
                {!searching && !results.length && (
                  <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>
                    Nenhum paciente encontrado.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <Link
          href="/pacientes/novo?returnTo=/servicos/novo"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--primary)" }}
        >
          <Plus className="size-4" />
          Cadastrar novo paciente
        </Link>
      </section>
      <section className="card">
        <h2 className="font-semibold">Dados do serviço</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="procedureType">
              Tipo de serviço *
            </label>
            <select
              className="input"
              id="procedureType"
              required
              value={draft.procedureTypeId}
              onChange={(event) =>
                setDraft((value) => ({ ...value, procedureTypeId: event.target.value }))
              }
            >
              <option value="">Selecione...</option>
              {types.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="performedAt">
              Data do serviço *
            </label>
            <input
              className="input"
              id="performedAt"
              type="date"
              required
              value={draft.performedAt}
              onChange={(event) =>
                setDraft((value) => ({ ...value, performedAt: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="charged">
              Valor cobrado *
            </label>
            <input
              className="input"
              id="charged"
              inputMode="numeric"
              value={formatCurrency(draft.charged)}
              onChange={(event) =>
                setDraft((value) => ({ ...value, charged: parseCurrencyInput(event.target.value) }))
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="cost">
              Custo do procedimento
            </label>
            <input
              className="input"
              id="cost"
              inputMode="numeric"
              value={formatCurrency(draft.cost)}
              onChange={(event) =>
                setDraft((value) => ({ ...value, cost: parseCurrencyInput(event.target.value) }))
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="profit">
              Lucro calculado
            </label>
            <input
              className="input font-semibold"
              id="profit"
              value={formatCurrency(profit)}
              readOnly
              aria-readonly="true"
              style={{ color: profit < 0 ? "var(--danger)" : "var(--success)" }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">
              Descrição
            </label>
            <textarea
              className="textarea"
              id="description"
              maxLength={5000}
              value={draft.description}
              onChange={(event) =>
                setDraft((value) => ({ ...value, description: event.target.value }))
              }
              placeholder="Detalhes clínicos do procedimento..."
            />
          </div>
        </div>
      </section>
      <section className="card">
        <div className="mb-5">
          <h2 className="font-semibold">Dentes envolvidos</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Opcional. Selecione um ou vários dentes permanentes.
          </p>
        </div>
        <Odontogram
          selected={draft.teeth}
          onChange={(teeth) => setDraft((value) => ({ ...value, teeth }))}
        />
        {draft.teeth.length > 0 && (
          <p className="mt-4 text-sm font-medium" style={{ color: "var(--primary)" }}>
            Selecionados: {draft.teeth.join(", ")}
          </p>
        )}
      </section>
      <div className="flex justify-end">
        {!premium && (
          <p className="mr-auto max-w-md text-sm" style={{ color: "var(--muted)" }}>
            Ao registrar, você será direcionado ao Mercado Pago. O primeiro mês da assinatura é
            gratuito e seus dados permanecerão preenchidos.
          </p>
        )}
        <button className="btn-primary min-w-44" type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
          {saving ? (premium ? "Registrando..." : "Abrindo pagamento...") : "Registrar serviço"}
        </button>
      </div>
    </form>
  );
}

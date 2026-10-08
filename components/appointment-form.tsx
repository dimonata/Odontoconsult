"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { appointmentSchema } from "@/schemas/appointment";
import { formatPhone } from "@/lib/normalizers";

type PatientOption = { id: string; fullName: string; cpf: string; phone: string };
type TypeOption = { id: string; name: string; defaultMinutes: number };
type DentistOption = { id: string; name: string | null };

export function AppointmentForm({
  patients,
  appointmentTypes,
  dentists,
  initial,
}: {
  patients: PatientOption[];
  appointmentTypes: TypeOption[];
  dentists: DentistOption[];
  initial: { patientId?: string; date: string; time: string; dentistId: string };
}) {
  const router = useRouter();
  const [query, setQuery] = useState(
    patients.find((patient) => patient.id === initial.patientId)?.fullName ?? "",
  );
  const [patientId, setPatientId] = useState(initial.patientId ?? "");
  const [withoutRecord, setWithoutRecord] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [durationPreset, setDurationPreset] = useState("60");
  const [customDuration, setCustomDuration] = useState("60");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const filtered = useMemo(() => {
    const term = query.toLocaleLowerCase("pt-BR").replace(/\D/g, "");
    const raw = query.toLocaleLowerCase("pt-BR");
    if (!raw) return patients.slice(0, 8);
    return patients
      .filter(
        (item) =>
          item.fullName.toLocaleLowerCase("pt-BR").includes(raw) ||
          item.cpf.replace(/\D/g, "").includes(term) ||
          item.phone.replace(/\D/g, "").includes(term),
      )
      .slice(0, 8);
  }, [patients, query]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!withoutRecord && !patientId) {
      setErrors({ patientId: "Selecione um paciente ou use a opção sem ficha." });
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = {
      patientId: withoutRecord ? null : patientId || null,
      guestName: withoutRecord ? guestName : undefined,
      guestPhone: withoutRecord ? guestPhone : undefined,
      dentistId: String(form.get("dentistId") ?? ""),
      appointmentTypeId: String(form.get("appointmentTypeId") ?? ""),
      date: String(form.get("date") ?? ""),
      startTime: String(form.get("startTime") ?? ""),
      durationMinutes: Number(durationPreset === "custom" ? customDuration : durationPreset),
      notes: String(form.get("notes") ?? ""),
    };
    const parsed = appointmentSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => (next[String(issue.path[0])] ??= issue.message));
      setErrors(next);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as {
        appointment?: { id: string; calendarSyncStatus: string };
        error?: string;
        details?: Record<string, unknown>;
      };
      if (!response.ok || !data.appointment) {
        let message = data.error ?? "Não foi possível agendar.";
        const conflictStart = data.details?.startAt;
        const conflictEnd = data.details?.endAt;
        if (
          response.status === 409 &&
          typeof conflictStart === "string" &&
          typeof conflictEnd === "string"
        ) {
          const formatter = new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          });
          message += ` Conflito: ${formatter.format(new Date(conflictStart))}–${formatter.format(new Date(conflictEnd))}.`;
        }
        throw new Error(message);
      }
      if (data.appointment.calendarSyncStatus === "FAILED") {
        toast.warning("Consulta salva, mas não foi possível sincronizar com Google Calendar.");
      } else {
        toast.success("Consulta agendada com sucesso.");
      }
      router.push(`/agenda/${data.appointment.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível agendar.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-6">
      <div>
        <p className="label">Paciente</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" className={withoutRecord ? "btn-secondary" : "btn-primary"} onClick={() => setWithoutRecord(false)}>Paciente cadastrado</button>
          <button type="button" className={withoutRecord ? "btn-primary" : "btn-secondary"} onClick={() => setWithoutRecord(true)}>Primeira consulta, sem ficha</button>
        </div>
        {withoutRecord ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label">Nome para a consulta *</span>
              <input className="input" value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={120} required />
              {errors.guestName && <span className="mt-1 block text-xs" style={{ color: "var(--danger)" }}>{errors.guestName}</span>}
            </label>
            <label>
              <span className="label">Telefone de contato *</span>
              <input className="input" type="tel" inputMode="tel" value={guestPhone} onChange={(event) => setGuestPhone(formatPhone(event.target.value))} maxLength={15} placeholder="(00) 00000-0000" required />
              {errors.guestPhone && <span className="mt-1 block text-xs" style={{ color: "var(--danger)" }}>{errors.guestPhone}</span>}
            </label>
            <p className="text-xs sm:col-span-2" style={{ color: "var(--muted)" }}>A ficha poderá ser vinculada depois. Sem ficha e autorização, não haverá confirmação automática por WhatsApp.</p>
          </div>
        ) : (
        <>
        <label className="label" htmlFor="patientSearch">
          Pesquisar paciente cadastrado *
        </label>
        <input
          id="patientSearch"
          className="input"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPatientId(""); }}
          placeholder="Pesquisar por nome, CPF ou telefone"
        />
        <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border">
          {filtered.map((patient) => (
            <button
              type="button"
              key={patient.id}
              onClick={() => {
                setPatientId(patient.id);
                setQuery(patient.fullName);
              }}
              className="flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left text-sm last:border-0"
              style={patientId === patient.id ? { background: "var(--primary-soft)" } : {}}
            >
              <span className="font-medium">{patient.fullName}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {patient.phone}
              </span>
            </button>
          ))}
        </div>
        {errors.patientId && (
          <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
            {errors.patientId}
          </p>
        )}
        <Link
          href="/pacientes/novo?returnTo=/agenda/novo"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--primary)" }}
        >
          <UserPlus className="size-4" /> Cadastrar novo paciente
        </Link>
        </>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">
            Data *
          </label>
          <input
            className="input"
            id="date"
            name="date"
            type="date"
            required
            defaultValue={initial.date}
          />
          {errors.date && (
            <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
              {errors.date}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="startTime">
            Horário inicial *
          </label>
          <input
            className="input"
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue={initial.time}
          />
          {errors.startTime && (
            <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
              {errors.startTime}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="duration">
            Duração *
          </label>
          <select
            className="input"
            id="duration"
            value={durationPreset}
            onChange={(event) => setDurationPreset(event.target.value)}
          >
            <option value="30">30 minutos</option>
            <option value="45">45 minutos</option>
            <option value="60">1 hora</option>
            <option value="90">1h30</option>
            <option value="120">2 horas</option>
            <option value="custom">Personalizada</option>
          </select>
          {durationPreset === "custom" && (
            <input
              className="input mt-2"
              type="number"
              min={10}
              max={720}
              value={customDuration}
              placeholder="Minutos"
              onChange={(event) => setCustomDuration(event.target.value)}
            />
          )}
          {errors.durationMinutes && (
            <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
              {errors.durationMinutes}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="appointmentTypeId">
            Tipo de atendimento *
          </label>
          <select
            className="input"
            id="appointmentTypeId"
            name="appointmentTypeId"
            required
            onChange={(event) => {
              const type = appointmentTypes.find((item) => item.id === event.target.value);
              if (!type) return;
              const duration = String(type.defaultMinutes);
              if (["30", "45", "60", "90", "120"].includes(duration)) {
                setDurationPreset(duration);
              } else {
                setDurationPreset("custom");
                setCustomDuration(duration);
              }
            }}
          >
            <option value="">Selecione</option>
            {appointmentTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {errors.appointmentTypeId && (
            <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
              {errors.appointmentTypeId}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="dentistId">
            Dentista *
          </label>
          <select
            className="input"
            id="dentistId"
            name="dentistId"
            defaultValue={initial.dentistId}
            required
          >
            {dentists.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name ?? "Dentista"}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">
            Observações internas
          </label>
          <textarea
            className="textarea"
            id="notes"
            name="notes"
            maxLength={2000}
            placeholder="Não serão enviadas ao Google Calendar nem ao paciente."
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn-primary min-w-40" type="submit" disabled={submitting}>
          {submitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {submitting ? "Agendando..." : "Salvar consulta"}
        </button>
      </div>
    </form>
  );
}

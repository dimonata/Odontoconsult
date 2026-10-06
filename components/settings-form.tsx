"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const themes = [
  { value: "SYSTEM", nextTheme: "system", label: "Sistema", icon: Laptop },
  { value: "LIGHT", nextTheme: "light", label: "Claro", icon: Sun },
  { value: "DARK", nextTheme: "dark", label: "Escuro", icon: Moon },
] as const;

export function SettingsForm({
  initialTheme,
  clinicName,
  clinicTimezone,
  confirmationLeadMinutes,
  canEditClinic,
}: {
  initialTheme: "SYSTEM" | "LIGHT" | "DARK";
  clinicName: string;
  clinicTimezone: string;
  confirmationLeadMinutes: number;
  canEditClinic: boolean;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [selected, setSelected] = useState(initialTheme);
  const [name, setName] = useState(clinicName);
  const [timezone, setTimezone] = useState(clinicTimezone);
  const [leadMinutes, setLeadMinutes] = useState(String(confirmationLeadMinutes));
  const [savingClinic, setSavingClinic] = useState(false);
  async function choose(value: typeof selected, nextTheme: string) {
    setSelected(value);
    setTheme(nextTheme);
    const response = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: value }),
    });
    if (!response.ok) toast.error("Não foi possível salvar o tema.");
  }
  async function saveClinic(event: React.FormEvent) {
    event.preventDefault();
    setSavingClinic(true);
    const response = await fetch("/api/clinic", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, timezone, confirmationLeadMinutes: Number(leadMinutes) }),
    });
    const data = (await response.json()) as { error?: string };
    if (response.ok) {
      toast.success("Consultório atualizado.");
      router.refresh();
    } else toast.error(data.error ?? "Erro ao atualizar consultório.");
    setSavingClinic(false);
  }
  return (
    <div className="space-y-5">
      <section className="card">
        <h2 className="font-semibold">Aparência</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Escolha o tema usado neste dispositivo.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {themes.map(({ value, nextTheme, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              onClick={() => void choose(value, nextTheme)}
              className="relative flex items-center gap-3 rounded-xl border p-4 text-left transition"
              style={
                selected === value
                  ? { borderColor: "var(--primary)", background: "var(--primary-soft)" }
                  : undefined
              }
            >
              <Icon className="size-5" />
              <span className="text-sm font-semibold">{label}</span>
              {selected === value && (
                <Check
                  className="absolute top-3 right-3 size-4"
                  style={{ color: "var(--primary)" }}
                />
              )}
            </button>
          ))}
        </div>
      </section>
      <form className="card" onSubmit={saveClinic}>
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-xl"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            <Building2 className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Consultório</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Nome exibido para os membros.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Nome do consultório</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
              disabled={!canEditClinic}
            />
          </label>
          <label>
            <span className="label">Fuso horário</span>
            <select
              className="input"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              disabled={!canEditClinic}
            >
              <option value="America/Sao_Paulo">Brasília — America/Sao_Paulo</option>
              <option value="America/Manaus">Manaus — America/Manaus</option>
              <option value="America/Cuiaba">Cuiabá — America/Cuiaba</option>
              <option value="America/Rio_Branco">Rio Branco — America/Rio_Branco</option>
              <option value="America/Noronha">Fernando de Noronha — America/Noronha</option>
            </select>
          </label>
          <label>
            <span className="label">Pedir confirmação com antecedência</span>
            <select
              className="input"
              value={leadMinutes}
              onChange={(event) => setLeadMinutes(event.target.value)}
              disabled={!canEditClinic}
            >
              <option value="120">2 horas</option>
              <option value="240">4 horas</option>
              <option value="720">12 horas</option>
              <option value="1440">24 horas</option>
              <option value="2880">48 horas</option>
              <option value="4320">72 horas</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={!canEditClinic || savingClinic}>
              {savingClinic ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
        {!canEditClinic && (
          <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            Somente o proprietário pode alterar este nome.
          </p>
        )}
      </form>
      <section className="card">
        <h2 className="font-semibold">Privacidade e retenção</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
          Arquivos removidos da ficha são ocultados, mas mantidos para cumprir políticas de retenção
          e auditoria. Exclusões irreversíveis de prontuário não são realizadas pela interface.
        </p>
      </section>
    </div>
  );
}

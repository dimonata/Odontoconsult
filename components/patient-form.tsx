"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, LoaderCircle, Save, X } from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/camera-capture";
import { formatCpf, formatPhone } from "@/lib/normalizers";
import { patientSchema } from "@/schemas/patient";

type InitialPatient = {
  id: string;
  fullName: string;
  cpf: string;
  phone: string;
  birthDate: string;
  whatsappOptIn: boolean;
  notes: string | null;
  photoUrl: string | null;
};

export function PatientForm({
  initial,
  returnTo,
}: {
  initial?: InitialPatient;
  returnTo?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState(initial?.photoUrl ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      fullName: String(form.get("fullName") ?? ""),
      cpf: String(form.get("cpf") ?? ""),
      phone: String(form.get("phone") ?? ""),
      birthDate: String(form.get("birthDate") ?? ""),
      whatsappOptIn: form.get("whatsappOptIn") === "on",
      notes: String(form.get("notes") ?? ""),
    };
    const parsed = patientSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[String(issue.path[0])] ??= issue.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch(initial ? `/api/patients/${initial.id}` : "/api/patients", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as {
        patient?: { id: string };
        error?: string;
        details?: { fieldErrors?: Record<string, string[]> };
      };
      if (!response.ok || !data.patient) {
        if (data.details?.fieldErrors) {
          const next: Record<string, string> = {};
          Object.entries(data.details.fieldErrors).forEach(([key, value]) => {
            if (value?.[0]) next[key] = value[0];
          });
          setErrors(next);
        }
        throw new Error(data.error ?? "Erro ao salvar.");
      }
      const patientId = initial?.id ?? data.patient.id;
      if (photo) {
        const upload = new FormData();
        upload.set("file", photo);
        upload.set("category", "PHOTOGRAPH");
        upload.set("profilePhoto", "true");
        const uploadResponse = await fetch(`/api/patients/${patientId}/files`, {
          method: "POST",
          body: upload,
        });
        if (!uploadResponse.ok)
          toast.warning("Paciente salvo, mas não foi possível enviar a foto.");
      }
      toast.success(
        initial ? "Paciente atualizado com sucesso." : "Paciente cadastrado com sucesso.",
      );
      router.push(returnTo ? `${returnTo}?patientId=${patientId}` : `/pacientes/${patientId}`);
      router.refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Erro ao salvar paciente.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="card space-y-6">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-5 sm:flex-row">
          <div
            className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-bold"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Prévia da foto do paciente"
                className="h-full w-full object-cover"
              />
            ) : (
              "?"
            )}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-semibold">Foto do paciente</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Envie uma imagem ou use a câmera frontal do dispositivo.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <label className="btn-secondary">
                <ImagePlus className="size-4" />
                Enviar foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => selectPhoto(event.target.files?.[0])}
                />
              </label>
              <button className="btn-secondary" type="button" onClick={() => setCameraOpen(true)}>
                <Camera className="size-4" />
                Tirar foto
              </button>
              {preview && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setPhoto(undefined);
                    setPreview("");
                  }}
                  aria-label="Remover foto selecionada"
                >
                  <X className="size-4" />
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="fullName">
              Nome completo *
            </label>
            <input
              className="input"
              id="fullName"
              name="fullName"
              required
              maxLength={120}
              defaultValue={initial?.fullName}
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {errors.fullName}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="cpf">
              CPF *
            </label>
            <input
              className="input"
              id="cpf"
              name="cpf"
              required
              inputMode="numeric"
              maxLength={14}
              defaultValue={initial?.cpf}
              onChange={(event) => {
                event.currentTarget.value = formatCpf(event.currentTarget.value);
              }}
              placeholder="000.000.000-00"
              aria-invalid={!!errors.cpf}
            />
            {errors.cpf && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {errors.cpf}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Telefone *
            </label>
            <input
              className="input"
              id="phone"
              name="phone"
              required
              inputMode="tel"
              maxLength={15}
              defaultValue={initial?.phone}
              onChange={(event) => {
                event.currentTarget.value = formatPhone(event.currentTarget.value);
              }}
              placeholder="(00) 00000-0000"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {errors.phone}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="birthDate">
              Data de nascimento *
            </label>
            <input
              className="input"
              id="birthDate"
              name="birthDate"
              type="date"
              required
              defaultValue={initial?.birthDate}
              max={new Date().toISOString().slice(0, 10)}
              aria-invalid={!!errors.birthDate}
            />
            {errors.birthDate && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {errors.birthDate}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-xl border p-4">
              <input
                className="mt-1 size-4"
                type="checkbox"
                name="whatsappOptIn"
                defaultChecked={initial?.whatsappOptIn ?? false}
              />
              <span>
                <span className="block font-medium">Autoriza mensagens pelo WhatsApp</span>
                <span className="mt-1 block text-sm" style={{ color: "var(--muted)" }}>
                  O paciente autorizou confirmações de consulta e mensagens de aniversário.
                </span>
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">
              Observações
            </label>
            <textarea
              className="textarea"
              id="notes"
              name="notes"
              maxLength={5000}
              defaultValue={initial?.notes ?? ""}
              placeholder="Alergias, preferências ou outras informações relevantes..."
            />
            {errors.notes && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {errors.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary min-w-36" type="submit" disabled={submitting}>
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {submitting ? "Salvando..." : "Salvar paciente"}
          </button>
        </div>
      </form>
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            selectPhoto(file);
            setCameraOpen(false);
          }}
        />
      )}
    </>
  );
}

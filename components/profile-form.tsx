"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";

export function ProfileForm({
  user,
  clinicName,
}: {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    customImageKey: string | null;
  };
  clinicName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState(
    user.customImageKey ? "/api/profile/photo" : (user.image ?? ""),
  );
  const [saving, setSaving] = useState(false);
  function selectPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Erro ao salvar perfil.");
      if (photo) {
        const form = new FormData();
        form.set("file", photo);
        const upload = await fetch("/api/profile/photo", { method: "POST", body: form });
        const result = (await upload.json()) as { error?: string };
        if (!upload.ok) throw new Error(result.error ?? "Erro ao enviar foto.");
      }
      toast.success("Perfil atualizado com sucesso.");
      router.refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="card space-y-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Avatar name={name} image={preview} size={88} />
        <div className="text-center sm:text-left">
          <h2 className="font-semibold">Foto profissional</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            A foto inicial vem da sua conta Google.
          </p>
          <label className="btn-secondary mt-3">
            <Camera className="size-4" />
            Alterar foto
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => selectPhoto(event.target.files?.[0])}
            />
          </label>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="profile-name">
            Nome
          </label>
          <input
            className="input"
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
          />
        </div>
        <div>
          <label className="label" htmlFor="profile-email">
            E-mail
          </label>
          <input
            className="input"
            id="profile-email"
            value={user.email ?? ""}
            readOnly
            aria-readonly="true"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="profile-clinic">
            Consultório
          </label>
          <input
            className="input"
            id="profile-clinic"
            value={clinicName}
            readOnly
            aria-readonly="true"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

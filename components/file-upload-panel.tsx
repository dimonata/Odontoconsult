"use client";

import { useRef, useState } from "react";
import { LoaderCircle, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const categories = [
  { value: "RADIOGRAPH", label: "Radiografia" },
  { value: "PHOTOGRAPH", label: "Fotografia" },
  { value: "DOCUMENT", label: "Documento" },
  { value: "EXAM", label: "Exame" },
  { value: "OTHER", label: "Outro" },
];

export function FileUploadPanel({ patientId }: { patientId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("RADIOGRAPH");
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    form.set("category", category);
    try {
      const response = await fetch(`/api/patients/${patientId}/files`, {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Falha no upload.");
      toast.success("Arquivo enviado com sucesso.");
      if (ref.current) ref.current.value = "";
      router.refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="rounded-xl border border-dashed p-5">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="file-category">
            Categoria
          </label>
          <select
            className="input"
            id="file-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <label className={`btn-primary ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          {uploading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          {uploading ? "Enviando..." : "Selecionar arquivo"}
          <input
            ref={ref}
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={uploading}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
        JPG, PNG, WEBP ou PDF. O tipo real do arquivo será verificado no servidor.
      </p>
    </div>
  );
}

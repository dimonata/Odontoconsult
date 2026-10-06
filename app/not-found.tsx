import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="card max-w-md text-center">
        <SearchX className="mx-auto size-10" style={{ color: "var(--primary)" }} />
        <h1 className="mt-4 text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          O endereço pode estar incorreto ou o conteúdo não está mais disponível.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}

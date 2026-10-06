import { redirect } from "next/navigation";
import { Building2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "@/components/onboarding-form";
import { getAuthenticatedUser, getAuthContext } from "@/lib/auth-context";

export const metadata = { title: "Configurar consultório" };

export default async function OnboardingPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (await getAuthContext()) redirect("/dashboard");
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Logo />
        </div>
        <section className="card p-7 sm:p-9">
          <div
            className="mb-6 flex size-12 items-center justify-center rounded-2xl"
            style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
          >
            <Building2 className="size-6" />
          </div>
          <p className="eyebrow">Última etapa</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Prepare seu espaço de trabalho</h1>
          <p className="mt-3 leading-7" style={{ color: "var(--muted)" }}>
            Olá, {user.name?.split(" ")[0] ?? "profissional"}. Vamos criar o ambiente isolado do seu
            consultório.
          </p>
          <OnboardingForm />
          <div
            className="mt-7 flex items-start gap-3 rounded-xl border p-4 text-sm"
            style={{ background: "var(--surface-muted)" }}
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: "var(--success)" }} />
            <p style={{ color: "var(--muted)" }}>
              Seus pacientes, arquivos e indicadores ficarão vinculados exclusivamente a este
              consultório.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

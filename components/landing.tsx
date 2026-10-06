import { BarChart3, FileLock2, ShieldCheck, UsersRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { loginWithGoogle } from "@/features/auth/actions";

const benefits = [
  {
    icon: UsersRound,
    title: "Pacientes organizados",
    text: "Ficha clínica, arquivos e histórico em um só lugar.",
  },
  {
    icon: BarChart3,
    title: "Financeiro claro",
    text: "Faturamento, custos e lucro calculados a partir dos serviços.",
  },
  {
    icon: FileLock2,
    title: "Arquivos privados",
    text: "Radiografias e documentos com acesso autenticado.",
  },
];

export function Landing() {
  return (
    <main className="min-h-dvh overflow-hidden px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between">
          <Logo />
          <span
            className="hidden items-center gap-2 text-sm sm:flex"
            style={{ color: "var(--muted)" }}
          >
            <ShieldCheck className="size-4" style={{ color: "var(--success)" }} />
            Segurança desde a arquitetura
          </span>
        </header>
        <section className="grid min-h-[calc(100dvh-100px)] items-center gap-14 py-16 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="eyebrow mb-5">Gestão odontológica inteligente</p>
            <h1 className="max-w-3xl text-4xl leading-[1.08] font-bold tracking-[-0.04em] sm:text-6xl">
              Mais tempo para cuidar. <span style={{ color: "var(--primary)" }}>Mais clareza</span>{" "}
              para crescer.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8" style={{ color: "var(--muted)" }}>
              Gerencie pacientes, procedimentos, odontograma, documentos e indicadores financeiros
              em uma plataforma feita para a rotina do consultório.
            </p>
            <form action={loginWithGoogle} className="mt-9">
              <button type="submit" className="btn-primary h-13 px-6 text-base">
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path
                    fill="#fff"
                    d="M21.35 12.25c0-.71-.06-1.24-.2-1.79H12v3.26h5.37a4.66 4.66 0 0 1-1.99 2.97l-.02.11 2.89 2.23.2.02c1.84-1.7 2.9-4.2 2.9-6.8Z"
                  />
                  <path
                    fill="#fff"
                    opacity=".8"
                    d="M12 21.75c2.63 0 4.83-.87 6.44-2.7l-3.07-2.37c-.82.55-1.91.94-3.37.94a5.85 5.85 0 0 1-5.53-4.04l-.1.01-3 2.32-.03.1A9.73 9.73 0 0 0 12 21.75Z"
                  />
                  <path
                    fill="#fff"
                    opacity=".65"
                    d="M6.47 13.58A6 6 0 0 1 6.15 12c0-.55.11-1.08.3-1.58v-.11L3.4 7.95l-.1.05a9.76 9.76 0 0 0 .04 8.01l3.13-2.43Z"
                  />
                  <path
                    fill="#fff"
                    opacity=".9"
                    d="M12 6.38c1.83 0 3.07.79 3.78 1.44l2.72-2.66A9.25 9.25 0 0 0 12 2.25 9.73 9.73 0 0 0 3.3 8l3.14 2.42A5.88 5.88 0 0 1 12 6.38Z"
                  />
                </svg>
                Entrar com Google
              </button>
            </form>
            <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
              Ao entrar, você concorda com o uso dos dados exclusivamente para operar sua conta e
              seu consultório.
            </p>
          </div>
          <div className="relative">
            <div
              className="absolute -inset-16 -z-10 rounded-full opacity-20 blur-3xl"
              style={{ background: "var(--primary)" }}
            />
            <div className="card p-4 sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Visão geral
                  </p>
                  <p className="font-semibold">Consultório Sorriso</p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                >
                  Este mês
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["R$ 24.850", "R$ 17.420", "38 pacientes"].map((value, index) => (
                  <div
                    key={value}
                    className="rounded-xl border p-4"
                    style={{ background: "var(--surface-muted)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {["Faturamento", "Lucro", "Atendidos"][index]}
                    </p>
                    <p className="mt-2 text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div
                className="mt-5 flex h-44 items-end gap-2 rounded-xl border p-4"
                aria-hidden="true"
              >
                {[35, 50, 42, 68, 58, 82, 72, 91, 78, 96].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t-md"
                    style={{
                      height: `${height}%`,
                      background: index > 6 ? "var(--primary)" : "var(--primary-soft)",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:absolute lg:-right-5 lg:-bottom-20 lg:left-5">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div key={title} className="card p-4">
                  <Icon className="mb-3 size-5" style={{ color: "var(--primary)" }} />
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

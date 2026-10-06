"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  CircleUserRound,
  FilePlus2,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/features/auth/actions";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/agenda/novo", label: "Novo agendamento", icon: CalendarPlus },
  { href: "/pacientes", label: "Pacientes", icon: UsersRound },
  { href: "/pacientes/novo", label: "Cadastrar paciente", icon: UserPlus },
  { href: "/servicos/novo", label: "Registrar serviço", icon: FilePlus2 },
  { href: "/perfil", label: "Meu perfil", icon: CircleUserRound },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({
  children,
  user,
  clinicName,
}: {
  children: React.ReactNode;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    customImageKey: string | null;
  };
  clinicName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Logo />
      </div>
      <div
        className="mx-4 mb-4 rounded-xl border p-3"
        style={{ background: "var(--surface-muted)" }}
      >
        <p className="truncate text-xs" style={{ color: "var(--muted)" }}>
          Consultório
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold">{clinicName}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Navegação principal">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href === "/agenda" &&
              pathname.startsWith("/agenda/") &&
              pathname !== "/agenda/novo") ||
            (href === "/pacientes" &&
              pathname.startsWith("/pacientes/") &&
              pathname !== "/pacientes/novo");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              style={
                active
                  ? { background: "var(--primary-soft)", color: "var(--primary)" }
                  : { color: "var(--muted)" }
              }
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <form action={logout}>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-red-500/10"
            style={{ color: "var(--danger)" }}
            type="submit"
          >
            <LogOut className="size-[18px]" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r lg:block"
        style={{ background: "var(--surface)" }}
      >
        {sidebar}
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[286px] border-r transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--surface)" }}
        aria-hidden={!open}
      >
        <button
          className="absolute top-5 right-4 flex size-9 items-center justify-center rounded-lg"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="size-5" />
        </button>
        {sidebar}
      </aside>
      <div className="lg:col-start-2">
        <header
          className="sticky top-0 z-30 flex h-18 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-6 lg:px-8"
          style={{ background: "color-mix(in srgb, var(--background) 88%, transparent)" }}
        >
          <div className="flex items-center gap-3">
            <button
              className="flex size-10 items-center justify-center rounded-xl border lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-sm font-semibold sm:text-base">
                Olá, {user.name?.split(" ")[0] ?? "profissional"}
              </p>
              <p className="hidden text-xs sm:block" style={{ color: "var(--muted)" }}>
                Que bom ter você por aqui.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Avatar
              name={user.name}
              image={user.customImageKey ? "/api/profile/photo" : user.image}
            />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1540px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

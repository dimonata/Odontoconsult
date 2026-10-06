import { AppShell } from "@/components/app-shell";
import { requirePageContext } from "@/lib/auth-context";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const context = await requirePageContext();
  return (
    <AppShell user={context.user} clinicName={context.clinic.name}>
      {children}
    </AppShell>
  );
}

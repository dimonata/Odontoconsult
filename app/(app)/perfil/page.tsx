import { ProfileForm } from "@/components/profile-form";
import { requirePageContext } from "@/lib/auth-context";

export const metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const context = await requirePageContext();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Meu perfil</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Atualize como você aparece dentro do sistema.
        </p>
      </div>
      <ProfileForm user={context.user} clinicName={context.clinic.name} />
    </div>
  );
}

import { SettingsForm } from "@/components/settings-form";
import { CalendarIntegrationSettings } from "@/components/calendar-integration-settings";
import { SubscriptionCard } from "@/components/subscription-card";
import { requirePageContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const context = await requirePageContext();
  const [preference, clinic, subscription] = await Promise.all([
    prisma.userPreference.findUnique({
      where: { userId: context.userId },
      select: { theme: true },
    }),
    prisma.clinic.findUniqueOrThrow({
      where: { id: context.clinicId },
      select: { timezone: true, confirmationLeadMinutes: true },
    }),
    prisma.subscription.findUnique({ where: { clinicId: context.clinicId } }),
  ]);
  const subscriptionActive = subscription?.status === "AUTHORIZED";
  const configuredAmount = Number(process.env.MERCADO_PAGO_SUBSCRIPTION_AMOUNT_CENTS);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="eyebrow">Preferências</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Configurações</h1>
      </div>
      <SettingsForm
        initialTheme={preference?.theme ?? "SYSTEM"}
        clinicName={context.clinic.name}
        clinicTimezone={clinic.timezone}
        confirmationLeadMinutes={clinic.confirmationLeadMinutes}
        canEditClinic={context.role === "OWNER"}
      />
      <div className="mt-5">
        <SubscriptionCard
          active={subscriptionActive}
          amountCents={
            subscription?.amountCents ??
            (Number.isInteger(configuredAmount) && configuredAmount > 0 ? configuredAmount : null)
          }
          trialEndsAt={subscription?.trialEndsAt?.toISOString() ?? null}
        />
      </div>
      <div className="mt-5">
        <CalendarIntegrationSettings premium={subscriptionActive} />
      </div>
    </div>
  );
}

import { SettingsForm } from "@/components/settings-form";
import { CalendarIntegrationSettings } from "@/components/calendar-integration-settings";
import { SubscriptionCard } from "@/components/subscription-card";
import { WhatsAppMessageSettings } from "@/components/whatsapp-message-settings";
import { requirePageContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";

export const metadata = { title: "Configurações" };

async function countRecentAppointments(clinicId: string) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return prisma.appointment.count({
    where: {
      clinicId,
      startAt: { gte: ninetyDaysAgo, lt: new Date() },
      status: { not: "CANCELLED" },
      patient: { whatsappOptIn: true, archivedAt: null },
    },
  });
}

export default async function SettingsPage() {
  const context = await requirePageContext();
  const [preference, clinic, subscription, recentAppointments, eligiblePatients] = await Promise.all([
    prisma.userPreference.findUnique({
      where: { userId: context.userId },
      select: { theme: true },
    }),
    prisma.clinic.findUniqueOrThrow({
      where: { id: context.clinicId },
      select: { timezone: true, confirmationLeadMinutes: true, birthdayMessagesEnabled: true },
    }),
    prisma.subscription.findUnique({ where: { clinicId: context.clinicId } }),
    countRecentAppointments(context.clinicId),
    prisma.patient.count({
      where: { clinicId: context.clinicId, archivedAt: null, whatsappOptIn: true },
    }),
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
          lifetime={subscription?.provider === "PROMO_LIFETIME"}
          canRedeemCoupon={context.role === "OWNER"}
        />
      </div>
      <div className="mt-5">
        <CalendarIntegrationSettings premium={subscriptionActive} />
      </div>
      <div className="mt-5">
        <WhatsAppMessageSettings
          canEdit={context.role === "OWNER"}
          initialBirthdaysEnabled={clinic.birthdayMessagesEnabled}
          initialMonthlyAppointments={Math.round(recentAppointments / 3)}
          eligiblePatients={eligiblePatients}
          utilityRate={0.035}
          marketingRate={0.3217}
        />
      </div>
    </div>
  );
}

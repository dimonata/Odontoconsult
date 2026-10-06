import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { syncClinicSubscription } from "@/lib/subscription";

export async function POST() {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const subscription = await syncClinicSubscription(context.clinicId);
    return {
      active: subscription?.status === "AUTHORIZED",
      status: subscription?.status ?? "INACTIVE",
      trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
      nextPaymentAt: subscription?.nextPaymentAt?.toISOString() ?? null,
    };
  });
}

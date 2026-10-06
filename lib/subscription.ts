import "server-only";

import { randomUUID } from "node:crypto";
import type { SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

type ProviderSubscription = {
  id: string;
  preapproval_plan_id?: string | null;
  external_reference?: string | null;
  payer_email?: string | null;
  status: string;
  init_point?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    transaction_amount?: number;
    currency_id?: string;
    free_trial?: { frequency?: number; frequency_type?: string } | null;
  };
};

type ProviderPlan = {
  id: string;
  init_point?: string | null;
};

function config() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  const amountCents = Number(process.env.MERCADO_PAGO_SUBSCRIPTION_AMOUNT_CENTS);
  const currency = process.env.MERCADO_PAGO_CURRENCY?.trim() || "BRL";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!accessToken || !Number.isInteger(amountCents) || amountCents < 100 || !appUrl) {
    throw new AppError(
      503,
      "A assinatura ainda não foi configurada pelo administrador.",
      "BILLING_NOT_CONFIGURED",
    );
  }
  return { accessToken, amountCents, currency, appUrl };
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit) {
  const { accessToken } = config();
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      error?: string;
      cause?: Array<{ description?: string; code?: string }>;
    } | null;
    console.warn("Mercado Pago recusou a solicitação de assinatura", {
      path,
      status: response.status,
      reason: payload?.message ?? payload?.error ?? payload?.cause?.[0]?.code ?? "unknown",
    });
    throw new AppError(
      502,
      "O Mercado Pago não conseguiu iniciar a assinatura. Tente novamente.",
      "MERCADO_PAGO_ERROR",
    );
  }
  return (await response.json()) as T;
}

function providerStatus(status: string): SubscriptionStatus {
  if (status === "authorized") return "AUTHORIZED";
  if (status === "paused") return "PAUSED";
  if (status === "cancelled" || status === "canceled") return "CANCELLED";
  return "PENDING";
}

function optionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function createCheckoutPlan(returnUrl: string, clinicId: string) {
  const { amountCents, currency } = config();
  const configuredPlanId = process.env.MERCADO_PAGO_PLAN_ID?.trim();
  if (configuredPlanId) {
    return mercadoPagoRequest<ProviderPlan>(
      `/preapproval_plan/${encodeURIComponent(configuredPlanId)}`,
    );
  }
  return mercadoPagoRequest<ProviderPlan>("/preapproval_plan", {
    method: "POST",
    headers: { "X-Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      reason: "OdontoFlow — plano mensal",
      external_reference: clinicId,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        free_trial: { frequency: 1, frequency_type: "months" },
        transaction_amount: amountCents / 100,
        currency_id: currency,
      },
      back_url: returnUrl,
    }),
  });
}

export async function hasPremiumAccess(clinicId: string) {
  const count = await prisma.subscription.count({
    where: { clinicId, status: "AUTHORIZED" },
  });
  return count > 0;
}

export async function requirePremiumAccess(clinicId: string) {
  if (!(await hasPremiumAccess(clinicId))) {
    throw new AppError(402, "Este recurso requer uma assinatura ativa.", "SUBSCRIPTION_REQUIRED");
  }
}

export async function getSubscription(clinicId: string) {
  return prisma.subscription.findUnique({ where: { clinicId } });
}

export async function createSubscriptionCheckout(input: {
  clinicId: string;
  payerEmail: string;
  returnPath: string;
}) {
  const current = await getSubscription(input.clinicId);
  if (current?.status === "AUTHORIZED") return { active: true, checkoutUrl: null };
  if (current?.status === "PENDING" && current.checkoutUrl) {
    return { active: false, checkoutUrl: current.checkoutUrl };
  }
  const { amountCents, currency, appUrl } = config();
  const returnUrl = `${appUrl}/assinatura/retorno?returnTo=${encodeURIComponent(input.returnPath)}`;
  const plan = await createCheckoutPlan(returnUrl, input.clinicId);
  if (!plan.init_point) {
    throw new AppError(502, "O checkout do Mercado Pago não foi criado.", "CHECKOUT_NOT_CREATED");
  }
  await prisma.subscription.upsert({
    where: { clinicId: input.clinicId },
    create: {
      clinicId: input.clinicId,
      providerPlanId: plan.id,
      providerStatus: "pending",
      status: "PENDING",
      payerEmail: input.payerEmail,
      amountCents,
      currency,
      checkoutUrl: plan.init_point,
    },
    update: {
      providerPlanId: plan.id,
      providerSubscriptionId: null,
      providerStatus: "pending",
      status: "PENDING",
      payerEmail: input.payerEmail,
      amountCents,
      currency,
      checkoutUrl: plan.init_point,
      trialEndsAt: null,
      nextPaymentAt: null,
      lastSyncedAt: null,
    },
  });
  return { active: false, checkoutUrl: plan.init_point };
}

export async function syncProviderSubscription(providerSubscriptionId: string) {
  const provider = await mercadoPagoRequest<ProviderSubscription>(
    `/preapproval/${encodeURIComponent(providerSubscriptionId)}`,
  );
  let current = await prisma.subscription.findUnique({ where: { providerSubscriptionId } });
  if (!current && provider.preapproval_plan_id && provider.external_reference) {
    current = await prisma.subscription.findFirst({
      where: {
        providerPlanId: provider.preapproval_plan_id,
        clinicId: provider.external_reference,
      },
    });
  }
  if (!current) return null;
  const nextPaymentAt = optionalDate(provider.next_payment_date);
  return prisma.subscription.update({
    where: { id: current.id },
    data: {
      providerSubscriptionId: provider.id,
      providerStatus: provider.status,
      status: providerStatus(provider.status),
      payerEmail: provider.payer_email || current.payerEmail,
      checkoutUrl: provider.init_point || current.checkoutUrl,
      amountCents: provider.auto_recurring?.transaction_amount
        ? Math.round(provider.auto_recurring.transaction_amount * 100)
        : current.amountCents,
      currency: provider.auto_recurring?.currency_id || current.currency,
      trialEndsAt: provider.auto_recurring?.free_trial ? nextPaymentAt : null,
      nextPaymentAt,
      lastSyncedAt: new Date(),
    },
  });
}

export async function syncClinicSubscription(clinicId: string) {
  const current = await getSubscription(clinicId);
  if (!current) return null;
  if (current.providerSubscriptionId) {
    return syncProviderSubscription(current.providerSubscriptionId);
  }
  if (!current.providerPlanId) return current;
  const query = new URLSearchParams({
    preapproval_plan_id: current.providerPlanId,
    payer_email: current.payerEmail,
    limit: "20",
  });
  const search = await mercadoPagoRequest<{ results?: ProviderSubscription[] }>(
    `/preapproval/search?${query.toString()}`,
  );
  const results = search.results ?? [];
  const provider =
    results.find((candidate) => candidate.external_reference === current.clinicId) ??
    (results.length === 1 ? results[0] : undefined);
  if (!provider) return current;
  await prisma.subscription.update({
    where: { id: current.id },
    data: { providerSubscriptionId: provider.id },
  });
  return syncProviderSubscription(provider.id);
}

import "server-only";

import { randomUUID } from "node:crypto";
import type { SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

const defaultPlanId = "odonto-flow-monthly";

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
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string; cause?: Array<{ description?: string; code?: string }> }
      | null;
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

async function ensurePlan(returnUrl: string) {
  const { amountCents, currency } = config();
  const configuredPlanId = process.env.MERCADO_PAGO_PLAN_ID?.trim();
  if (configuredPlanId) return configuredPlanId;
  const stored = await prisma.billingPlan.findUnique({ where: { id: defaultPlanId } });
  if (stored && stored.amountCents === amountCents && stored.currency === currency) {
    return stored.providerPlanId;
  }
  const plan = await mercadoPagoRequest<{ id: string }>("/preapproval_plan", {
    method: "POST",
    headers: { "X-Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      reason: "OdontoFlow — plano mensal",
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
  await prisma.billingPlan.upsert({
    where: { id: defaultPlanId },
    create: {
      id: defaultPlanId,
      providerPlanId: plan.id,
      amountCents,
      currency,
    },
    update: { providerPlanId: plan.id, amountCents, currency },
  });
  return plan.id;
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
  const planId = await ensurePlan(returnUrl);
  const subscription = await mercadoPagoRequest<ProviderSubscription>("/preapproval", {
    method: "POST",
    headers: { "X-Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      preapproval_plan_id: planId,
      reason: "OdontoFlow — plano mensal",
      external_reference: input.clinicId,
      payer_email: input.payerEmail,
      back_url: returnUrl,
      status: "pending",
    }),
  });
  if (!subscription.init_point) {
    throw new AppError(502, "O checkout do Mercado Pago não foi criado.", "CHECKOUT_NOT_CREATED");
  }
  await prisma.subscription.upsert({
    where: { clinicId: input.clinicId },
    create: {
      clinicId: input.clinicId,
      providerPlanId: planId,
      providerSubscriptionId: subscription.id,
      providerStatus: subscription.status,
      status: providerStatus(subscription.status),
      payerEmail: input.payerEmail,
      amountCents,
      currency,
      checkoutUrl: subscription.init_point,
      lastSyncedAt: new Date(),
    },
    update: {
      providerPlanId: planId,
      providerSubscriptionId: subscription.id,
      providerStatus: subscription.status,
      status: providerStatus(subscription.status),
      payerEmail: input.payerEmail,
      amountCents,
      currency,
      checkoutUrl: subscription.init_point,
      trialEndsAt: null,
      nextPaymentAt: null,
      lastSyncedAt: new Date(),
    },
  });
  return { active: false, checkoutUrl: subscription.init_point };
}

export async function syncProviderSubscription(providerSubscriptionId: string) {
  const current = await prisma.subscription.findUnique({
    where: { providerSubscriptionId },
  });
  if (!current) return null;
  const provider = await mercadoPagoRequest<ProviderSubscription>(
    `/preapproval/${encodeURIComponent(providerSubscriptionId)}`,
  );
  const nextPaymentAt = optionalDate(provider.next_payment_date);
  return prisma.subscription.update({
    where: { id: current.id },
    data: {
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
  if (!current?.providerSubscriptionId) return current;
  return syncProviderSubscription(current.providerSubscriptionId);
}

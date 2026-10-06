import { validMercadoPagoSignature } from "@/lib/mercado-pago-webhook";
import { syncProviderSubscription } from "@/lib/subscription";

type MercadoPagoNotification = {
  type?: string;
  data?: { id?: string | number };
};

export async function POST(request: Request) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!secret) return Response.json({ error: "Webhook não configurado." }, { status: 503 });
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as MercadoPagoNotification;
  const bodyDataId = body.data?.id;
  const dataId =
    url.searchParams.get("data.id") ?? (bodyDataId === undefined ? null : String(bodyDataId));
  const valid = validMercadoPagoSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret,
  });
  if (!valid) return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  const type = url.searchParams.get("type") ?? body.type;
  if (type === "subscription_preapproval" && dataId) {
    await syncProviderSubscription(dataId);
  }
  return Response.json({ received: true });
}

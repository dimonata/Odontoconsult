import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validMercadoPagoSignature } from "@/lib/mercado-pago-webhook";

describe("assinatura do webhook Mercado Pago", () => {
  it("aceita um manifesto HMAC válido", () => {
    const timestamp = "1760000000";
    const dataId = "preapproval-123";
    const requestId = "request-456";
    const secret = "webhook-secret";
    const hash = createHmac("sha256", secret)
      .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
      .digest("hex");
    expect(
      validMercadoPagoSignature({
        signature: `ts=${timestamp},v1=${hash}`,
        requestId,
        dataId,
        secret,
        now: Number(timestamp) * 1_000,
      }),
    ).toBe(true);
  });

  it("rejeita assinatura adulterada", () => {
    expect(
      validMercadoPagoSignature({
        signature: `ts=1760000000,v1=${"0".repeat(64)}`,
        requestId: "request-456",
        dataId: "preapproval-123",
        secret: "webhook-secret",
        now: 1_760_000_000_000,
      }),
    ).toBe(false);
  });
});

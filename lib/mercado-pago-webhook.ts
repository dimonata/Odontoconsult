import { createHmac, timingSafeEqual } from "node:crypto";

export function validMercadoPagoSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  now?: number;
}) {
  if (!input.signature || !input.requestId || !input.dataId || !input.secret) return false;
  const parts = Object.fromEntries(
    input.signature.split(",").map((item) => {
      const [key, ...value] = item.trim().split("=");
      return [key?.toLowerCase(), value.join("=")];
    }),
  );
  const timestamp = parts.ts;
  const received = parts.v1;
  if (!timestamp || !/^\d+$/.test(timestamp) || !received || !/^[a-f\d]{64}$/i.test(received)) {
    return false;
  }
  const now = input.now ?? Date.now();
  if (Math.abs(now - Number(timestamp) * 1_000) > 5 * 60_000) return false;
  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received.toLowerCase()));
}

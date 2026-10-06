import { createHash, timingSafeEqual } from "node:crypto";

export function lifetimeCouponHash(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function matchesLifetimeCoupon(code: string, configuredHash: string) {
  const expected = configuredHash.trim().toLowerCase();
  if (!/^[a-f\d]{64}$/.test(expected)) return false;
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(lifetimeCouponHash(code), "hex"),
  );
}

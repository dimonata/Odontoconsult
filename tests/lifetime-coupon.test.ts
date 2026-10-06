import { describe, expect, it } from "vitest";
import { lifetimeCouponHash, matchesLifetimeCoupon } from "@/lib/lifetime-coupon";

describe("cupom vitalício", () => {
  it("normaliza maiúsculas e espaços antes de validar", () => {
    const hash = lifetimeCouponHash("ODONTO-VITALICIO-2026");
    expect(matchesLifetimeCoupon("  odonto-vitalicio-2026  ", hash)).toBe(true);
  });

  it("rejeita código diferente e hash malformado", () => {
    const hash = lifetimeCouponHash("ODONTO-VITALICIO-2026");
    expect(matchesLifetimeCoupon("OUTRO-CUPOM", hash)).toBe(false);
    expect(matchesLifetimeCoupon("ODONTO-VITALICIO-2026", "invalido")).toBe(false);
  });
});

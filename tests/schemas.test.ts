import { describe, expect, it } from "vitest";
import { patientSchema } from "@/schemas/patient";
import { procedureSchema } from "@/schemas/procedure";

describe("schemas clínicos", () => {
  it("aceita paciente completo e rejeita CPF inválido", () => {
    const base = {
      fullName: "Paciente Fictício",
      cpf: "529.982.247-25",
      phone: "(11) 98765-4321",
      birthDate: "1990-01-10",
      notes: "",
    };
    expect(patientSchema.safeParse(base).success).toBe(true);
    expect(patientSchema.safeParse({ ...base, cpf: "000.000.000-00" }).success).toBe(false);
  });

  it("deduplica dentes permanentes e rejeita numeração inválida", () => {
    const base = {
      patientId: "cm12345678901234567890123",
      procedureTypeId: "cm12345678901234567890124",
      performedAt: "2026-09-25",
      chargedAmountCents: 10000,
      costCents: 2000,
      teeth: [16, 16, 17],
    };
    const parsed = procedureSchema.parse(base);
    expect(parsed.teeth).toEqual([16, 17]);
    expect(procedureSchema.safeParse({ ...base, teeth: [99] }).success).toBe(false);
  });
});

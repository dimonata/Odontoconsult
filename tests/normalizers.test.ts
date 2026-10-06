import { describe, expect, it } from "vitest";
import { formatCpf, formatPhone, isValidCpf, onlyDigits } from "@/lib/normalizers";

describe("CPF e telefone", () => {
  it("valida dígitos verificadores e rejeita sequências", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("normaliza e formata sem depender da pontuação pesquisada", () => {
    expect(onlyDigits("529.982.247-25")).toBe("52998224725");
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });
});

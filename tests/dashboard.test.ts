import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  procedureFindMany: vi.fn(),
  appointmentFindMany: vi.fn(),
  appointmentFindFirst: vi.fn(),
  clinicFindUniqueOrThrow: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    procedure: { findMany: mocks.procedureFindMany },
    appointment: {
      findMany: mocks.appointmentFindMany,
      findFirst: mocks.appointmentFindFirst,
    },
    clinic: { findUniqueOrThrow: mocks.clinicFindUniqueOrThrow },
  },
}));

import { getDashboardData, resolvePeriod } from "@/services/dashboard";

describe("dashboard financeiro", () => {
  it("resolve períodos com datas civis", () => {
    const custom = resolvePeriod("custom", "2026-01-01", "2026-01-31");
    expect(custom).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });

  it("calcula faturamento, custos, lucro, ticket e pacientes no servidor", async () => {
    mocks.clinicFindUniqueOrThrow.mockResolvedValue({ timezone: "America/Sao_Paulo" });
    mocks.appointmentFindMany.mockResolvedValue([]);
    mocks.appointmentFindFirst.mockResolvedValue(null);
    mocks.procedureFindMany.mockResolvedValue([
      {
        id: "1",
        performedAt: new Date("2026-09-01T00:00:00Z"),
        chargedAmountCents: 10000n,
        costCents: 2500n,
        patientId: "p1",
        patient: { fullName: "Ana" },
        procedureTypeId: "t1",
        procedureType: { name: "Limpeza" },
      },
      {
        id: "2",
        performedAt: new Date("2026-09-02T00:00:00Z"),
        chargedAmountCents: 30000n,
        costCents: 5000n,
        patientId: "p1",
        patient: { fullName: "Ana" },
        procedureTypeId: "t2",
        procedureType: { name: "Canal" },
      },
    ]);
    const data = await getDashboardData(
      {
        userId: "u",
        clinicId: "clinic-secure",
        role: "OWNER",
        user: { name: null, email: null, image: null, customImageKey: null },
        clinic: { name: "C" },
      },
      { period: "custom", from: "2026-09-01", to: "2026-09-30" },
    );
    expect(data.metrics).toEqual({
      revenueCents: 40000,
      costsCents: 7500,
      profitCents: 32500,
      patients: 1,
      procedures: 2,
      averageTicketCents: 20000,
    });
    expect(mocks.procedureFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clinicId: "clinic-secure" }) }),
    );
  });
});

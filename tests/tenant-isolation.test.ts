import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    patient: { findMany: mocks.findMany, count: mocks.count },
    $transaction: mocks.transaction,
  },
}));

import { listPatients } from "@/services/patients";

describe("isolamento por consultório", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
  });

  it("injeta clinicId da sessão em listagem e contagem", async () => {
    await listPatients(
      {
        userId: "user-a",
        clinicId: "clinic-a",
        role: "DENTIST",
        user: { name: "Dentista", email: null, image: null, customImageKey: null },
        clinic: { name: "A" },
      },
      { q: "52998224725", page: 1, pageSize: 20 },
    );

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: "clinic-a", archivedAt: null }),
      }),
    );
    expect(mocks.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ clinicId: "clinic-a" }),
    });
  });
});

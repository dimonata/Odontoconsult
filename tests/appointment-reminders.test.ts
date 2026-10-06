import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appointmentFindMany: vi.fn(),
  messageUpsert: vi.fn(),
  messageUpdateMany: vi.fn(),
  messageUpdate: vi.fn(),
  appointmentUpdate: vi.fn(),
  auditCreate: vi.fn(),
  historyCreate: vi.fn(),
  transaction: vi.fn(),
  sendConfirmation: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    appointment: {
      findMany: mocks.appointmentFindMany,
      update: mocks.appointmentUpdate,
    },
    appointmentMessage: {
      upsert: mocks.messageUpsert,
      updateMany: mocks.messageUpdateMany,
      update: mocks.messageUpdate,
    },
    auditLog: { create: mocks.auditCreate },
    appointmentHistory: { create: mocks.historyCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/services/messaging", () => ({
  messagingProvider: () => ({
    name: "TEST_PROVIDER",
    sendConfirmation: mocks.sendConfirmation,
  }),
}));

import { POST } from "@/app/api/jobs/appointment-reminders/route";

describe("job de lembretes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mocks.appointmentFindMany.mockResolvedValue([
      {
        id: "appointment-1",
        clinicId: "clinic-1",
        patientId: "patient-1",
        dentistId: "dentist-1",
        startAt: new Date("2026-09-26T12:00:00.000Z"),
        status: "SCHEDULED",
        patient: { fullName: "Maria Silva", phoneNormalized: "11999999999" },
        clinic: { name: "Clínica", timezone: "America/Sao_Paulo" },
      },
    ]);
    mocks.messageUpsert.mockResolvedValue({ id: "message-1", status: "QUEUED" });
  });

  afterEach(() => delete process.env.CRON_SECRET);

  it("não envia quando outra execução já reivindicou a mensagem", async () => {
    mocks.messageUpdateMany.mockResolvedValue({ count: 0 });
    const response = await POST(
      new Request("http://localhost/api/jobs/appointment-reminders", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ inspected: 1, sent: 0, failed: 0 });
    expect(mocks.sendConfirmation).not.toHaveBeenCalled();
  });
});

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
  sendBirthday: vi.fn(),
  queryRaw: vi.fn(),
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
    $queryRaw: mocks.queryRaw,
  },
}));
vi.mock("@/services/messaging", () => ({
  messagingProvider: () => ({
    name: "TEST_PROVIDER",
    sendConfirmation: mocks.sendConfirmation,
    sendBirthday: mocks.sendBirthday,
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
    mocks.queryRaw.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("não envia quando outra execução já reivindicou a mensagem", async () => {
    mocks.messageUpdateMany.mockResolvedValue({ count: 0 });
    const response = await POST(
      new Request("http://localhost/api/jobs/appointment-reminders", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      inspected: 1,
      sent: 0,
      failed: 0,
      birthdays: { inspected: 0, sent: 0, failed: 0 },
    });
    expect(mocks.sendConfirmation).not.toHaveBeenCalled();
  });

  it("envia uma única mensagem de aniversário identificada pelo paciente e ano", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00.000Z"));
    mocks.appointmentFindMany.mockResolvedValue([]);
    mocks.queryRaw.mockResolvedValue([
      {
        id: "patient-1",
        clinicId: "clinic-1",
        fullName: "Maria Silva",
        phoneNormalized: "11999999999",
        clinicName: "Clínica",
        timezone: "America/Sao_Paulo",
      },
    ]);
    mocks.messageUpdateMany.mockResolvedValue({ count: 1 });
    mocks.sendBirthday.mockResolvedValue({ providerMessageId: "wamid.birthday" });

    const response = await POST(
      new Request("http://localhost/api/jobs/appointment-reminders", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.messageUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: "birthday:patient-1:2026" },
        create: expect.objectContaining({
          appointmentId: null,
          type: "BIRTHDAY_GREETING",
        }),
      }),
    );
    expect(mocks.sendBirthday).toHaveBeenCalledWith({
      to: "11999999999",
      patientFirstName: "Maria",
      clinicName: "Clínica",
    });
    expect(await response.json()).toEqual({
      inspected: 0,
      sent: 0,
      failed: 0,
      birthdays: { inspected: 1, sent: 1, failed: 0 },
    });
  });
});

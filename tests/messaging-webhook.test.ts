import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  messageFindFirst: vi.fn(),
  messageUpdate: vi.fn(),
  messageUpdateMany: vi.fn(),
  appointmentUpdate: vi.fn(),
  auditCreate: vi.fn(),
  historyCreate: vi.fn(),
  transaction: vi.fn(),
  sync: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    appointmentMessage: {
      findFirst: mocks.messageFindFirst,
      update: mocks.messageUpdate,
      updateMany: mocks.messageUpdateMany,
    },
    appointment: { update: mocks.appointmentUpdate },
    auditLog: { create: mocks.auditCreate },
    appointmentHistory: { create: mocks.historyCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/services/google-calendar", () => ({ syncAppointmentToGoogle: mocks.sync }));

import { GET, POST } from "@/app/api/webhooks/messaging/route";

describe("webhook de mensagens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_APP_SECRET = "app-secret";
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "verify-secret";
    mocks.messageFindFirst.mockResolvedValue({
      id: "message-1",
      appointment: {
        id: "appointment-1",
        dentistId: "dentist-1",
        clinicId: "clinic-1",
        status: "CONFIRMATION_PENDING",
      },
    });
    mocks.messageUpdate.mockResolvedValue({});
    mocks.appointmentUpdate.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
    mocks.historyCreate.mockResolvedValue({});
    mocks.transaction.mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env.WHATSAPP_APP_SECRET;
    delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  });

  it("responde ao desafio de verificação da Meta", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/webhooks/messaging?hub.mode=subscribe&hub.verify_token=verify-secret&hub.challenge=12345",
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("12345");
  });

  it("confirma a consulta ao receber botão com assinatura válida", async () => {
    const body = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ context: { id: "wamid.sent" }, button: { payload: "CONFIRM" } }],
              },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${createHmac("sha256", "app-secret").update(body).digest("hex")}`;
    const response = await POST(
      new Request("http://localhost/api/webhooks/messaging", {
        method: "POST",
        headers: { "x-hub-signature-256": signature },
        body,
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.messageFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerMessageId: "wamid.sent", type: "CONFIRMATION_REQUEST" },
      }),
    );
    expect(mocks.appointmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) }),
    );
    expect(mocks.sync).toHaveBeenCalledWith("appointment-1");
  });
});

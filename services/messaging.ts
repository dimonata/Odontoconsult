import "server-only";

export type ConfirmationMessageInput = {
  to: string;
  patientFirstName: string;
  clinicName: string;
  date: string;
  time: string;
};

export type BirthdayMessageInput = Pick<
  ConfirmationMessageInput,
  "to" | "patientFirstName" | "clinicName"
>;

export interface MessagingProvider {
  readonly name: string;
  sendConfirmation(input: ConfirmationMessageInput): Promise<{ providerMessageId: string }>;
  sendBirthday(input: BirthdayMessageInput): Promise<{ providerMessageId: string }>;
}

class WhatsAppCloudProvider implements MessagingProvider {
  readonly name = "WHATSAPP_CLOUD";

  private async sendTemplate(input: {
    to: string;
    templateName: string;
    parameters: Array<{ type: "text"; text: string }>;
    buttons?: Array<{
      type: "button";
      sub_type: "quick_reply";
      index: string;
      parameters: Array<{ type: "payload"; payload: string }>;
    }>;
  }) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) throw new Error("MESSAGING_NOT_CONFIGURED");
    const version = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v23.0";
    const digits = input.to.replace(/\D/g, "");
    const countryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? "55";
    const recipient = digits.length <= 11 ? `${countryCode}${digits}` : digits;
    const response = await fetch(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: input.parameters,
              },
              ...(input.buttons ?? []),
            ],
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`WHATSAPP_${response.status}`);
    const payload = (await response.json()) as { messages?: Array<{ id: string }> };
    const providerMessageId = payload.messages?.[0]?.id;
    if (!providerMessageId) throw new Error("WHATSAPP_INVALID_RESPONSE");
    return { providerMessageId };
  }

  sendConfirmation(input: ConfirmationMessageInput) {
    return this.sendTemplate({
      to: input.to,
      templateName: process.env.WHATSAPP_CONFIRMATION_TEMPLATE ?? "appointment_confirmation",
      parameters: [
        { type: "text", text: input.patientFirstName },
        { type: "text", text: input.clinicName },
        { type: "text", text: input.date },
        { type: "text", text: input.time },
      ],
      buttons: [
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [{ type: "payload", payload: "CONFIRM" }],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [{ type: "payload", payload: "CANCEL" }],
        },
      ],
    });
  }

  sendBirthday(input: BirthdayMessageInput) {
    return this.sendTemplate({
      to: input.to,
      templateName: process.env.WHATSAPP_BIRTHDAY_TEMPLATE ?? "birthday_greeting",
      parameters: [
        { type: "text", text: input.patientFirstName },
        { type: "text", text: input.clinicName },
      ],
    });
  }
}

export function messagingProvider(): MessagingProvider {
  return new WhatsAppCloudProvider();
}

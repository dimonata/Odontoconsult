import { z } from "zod";
import { onlyDigits } from "@/lib/normalizers";

export const appointmentStatuses = [
  "SCHEDULED",
  "CONFIRMATION_PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

const appointmentFields = z.object({
  patientId: z.string().min(1).nullable().optional(),
  guestName: z.string().trim().max(120).optional(),
  guestPhone: z.string().trim().max(20).optional(),
  dentistId: z.string().min(1, "Selecione o dentista."),
  appointmentTypeId: z.string().min(1, "Selecione o tipo de atendimento."),
  date: z.iso.date("Informe uma data válida."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido."),
  durationMinutes: z.coerce.number().int().min(10).max(720),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const appointmentSchema = appointmentFields.superRefine((value, context) => {
  if (value.patientId) return;
  if (!value.guestName || value.guestName.length < 3) {
    context.addIssue({ code: "custom", path: ["guestName"], message: "Informe o nome para a consulta." });
  }
  if (![10, 11].includes(onlyDigits(value.guestPhone ?? "").length)) {
    context.addIssue({ code: "custom", path: ["guestPhone"], message: "Informe um telefone válido." });
  }
});

export const appointmentUpdateSchema = appointmentFields.partial().extend({
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(appointmentStatuses).optional(),
  cancellationSource: z.enum(["PATIENT", "DENTIST", "SYSTEM"]).optional(),
});

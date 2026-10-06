import { z } from "zod";

export const appointmentStatuses = [
  "SCHEDULED",
  "CONFIRMATION_PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Selecione um paciente."),
  dentistId: z.string().min(1, "Selecione o dentista."),
  appointmentTypeId: z.string().min(1, "Selecione o tipo de atendimento."),
  date: z.iso.date("Informe uma data válida."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido."),
  durationMinutes: z.coerce.number().int().min(10).max(720),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const appointmentUpdateSchema = appointmentSchema.partial().extend({
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(appointmentStatuses).optional(),
  cancellationSource: z.enum(["PATIENT", "DENTIST", "SYSTEM"]).optional(),
});

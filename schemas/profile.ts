import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
});

export const clinicSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do consultório.").max(120),
  timezone: z
    .enum([
      "America/Sao_Paulo",
      "America/Manaus",
      "America/Cuiaba",
      "America/Rio_Branco",
      "America/Noronha",
    ])
    .optional(),
  confirmationLeadMinutes: z.coerce.number().int().min(60).max(10_080).optional(),
});

export const preferenceSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
});

export const workdayScheduleSchema = z
  .object({
    workdayStartMinute: z.coerce.number().int().min(0).max(1_380),
    workdayEndMinute: z.coerce.number().int().min(60).max(1_440),
  })
  .refine((value) => value.workdayEndMinute - value.workdayStartMinute >= 60, {
    message: "O expediente precisa ter pelo menos uma hora.",
    path: ["workdayEndMinute"],
  });

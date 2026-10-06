import { z } from "zod";

const permanentTeeth = new Set([
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
]);

export const procedureSchema = z.object({
  patientId: z.string().cuid(),
  procedureTypeId: z.string().cuid(),
  performedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Data inválida."),
  chargedAmountCents: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  costCents: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  description: z.string().trim().max(5000).optional().default(""),
  teeth: z
    .array(
      z
        .number()
        .int()
        .refine((value) => permanentTeeth.has(value), "Dente inválido."),
    )
    .max(32)
    .default([])
    .transform((items) => [...new Set(items)]),
});

export type ProcedureInput = z.infer<typeof procedureSchema>;

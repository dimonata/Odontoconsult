import { z } from "zod";
import { isValidCpf, onlyDigits } from "@/lib/normalizers";

const civilDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Informe uma data válida.")
  .refine(
    (value) => new Date(`${value}T00:00:00.000Z`) <= new Date(),
    "A data não pode ser futura.",
  );

export const patientSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo.").max(120),
  cpf: z.string().trim().refine(isValidCpf, "CPF inválido."),
  phone: z
    .string()
    .trim()
    .refine((value) => [10, 11].includes(onlyDigits(value).length), "Telefone inválido."),
  birthDate: civilDateSchema,
  notes: z.string().trim().max(5000).optional().default(""),
});

export const patientUpdateSchema = patientSchema.partial();

export const patientQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type PatientInput = z.infer<typeof patientSchema>;

import { describe, expect, it } from "vitest";
import { appointmentDuration } from "@/lib/appointment-ui";
import { clinicDayRange, localParts, zonedDateTimeToUtc } from "@/lib/timezone";
import { appointmentSchema, appointmentUpdateSchema } from "@/schemas/appointment";

describe("agendamentos", () => {
  const valid = {
    patientId: "patient-1",
    dentistId: "dentist-1",
    appointmentTypeId: "type-1",
    date: "2026-09-25",
    startTime: "09:30",
    durationMinutes: 60,
    notes: "Retorno",
  };

  it("valida data, horário e limites de duração", () => {
    expect(appointmentSchema.safeParse(valid).success).toBe(true);
    expect(appointmentSchema.safeParse({ ...valid, startTime: "25:00" }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...valid, durationMinutes: 5 }).success).toBe(false);
  });

  it("permite primeira consulta sem ficha com nome e telefone de contato", () => {
    expect(appointmentSchema.safeParse({ ...valid, patientId: null, guestName: "Ana Silva", guestPhone: "(11) 99999-9999" }).success).toBe(true);
    expect(appointmentSchema.safeParse({ ...valid, patientId: null, guestName: "Ana Silva", guestPhone: "" }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...valid, patientId: null, guestName: "", guestPhone: "(11) 99999-9999" }).success).toBe(false);
  });

  it("permite vincular uma ficha ao agendamento posteriormente", () => {
    expect(appointmentUpdateSchema.parse({ patientId: "patient-2" })).toEqual({ patientId: "patient-2" });
  });

  it("aceita atualização somente de status sem preencher outros campos", () => {
    expect(appointmentUpdateSchema.parse({ status: "CONFIRMED" })).toEqual({
      status: "CONFIRMED",
    });
  });

  it("converte o horário civil do consultório para UTC e volta sem deslocamento", () => {
    const utc = zonedDateTimeToUtc("2026-09-25", "09:30", "America/Sao_Paulo");
    expect(utc.toISOString()).toBe("2026-09-25T12:30:00.000Z");
    expect(localParts(utc, "America/Sao_Paulo")).toEqual({
      date: "2026-09-25",
      time: "09:30",
    });
  });

  it("gera o intervalo diário e calcula a duração", () => {
    const range = clinicDayRange("2026-09-25", "America/Manaus");
    expect(range.start.toISOString()).toBe("2026-09-25T04:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-26T04:00:00.000Z");
    expect(appointmentDuration(range.start, range.end)).toBe(1_440);
  });
});

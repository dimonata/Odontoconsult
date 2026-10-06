export const appointmentStatus = {
  SCHEDULED: { label: "Agendada", color: "#64748b", background: "#e2e8f0" },
  CONFIRMATION_PENDING: {
    label: "Aguardando confirmação",
    color: "#854d0e",
    background: "#fef3c7",
  },
  CONFIRMED: { label: "Confirmada", color: "#166534", background: "#dcfce7" },
  CANCELLED: { label: "Cancelada", color: "#991b1b", background: "#fee2e2" },
  COMPLETED: { label: "Concluída", color: "#075985", background: "#e0f2fe" },
  NO_SHOW: { label: "Paciente não compareceu", color: "#6b21a8", background: "#f3e8ff" },
} as const;

export type AppointmentStatusKey = keyof typeof appointmentStatus;

export function appointmentDuration(startAt: string | Date, endAt: string | Date) {
  return Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000);
}

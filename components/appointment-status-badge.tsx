import { appointmentStatus, type AppointmentStatusKey } from "@/lib/appointment-ui";

export function AppointmentStatusBadge({ status }: { status: AppointmentStatusKey }) {
  const item = appointmentStatus[status];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: item.color, background: item.background }}
    >
      {item.label}
    </span>
  );
}

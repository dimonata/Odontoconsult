ALTER TABLE "Appointment"
  ALTER COLUMN "patientId" DROP NOT NULL,
  ADD COLUMN "guestName" TEXT,
  ADD COLUMN "guestPhone" TEXT;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_patient_or_guest" CHECK (
    "patientId" IS NOT NULL OR (NULLIF(BTRIM("guestName"), '') IS NOT NULL AND NULLIF(BTRIM("guestPhone"), '') IS NOT NULL)
  );

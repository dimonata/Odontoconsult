ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_RESCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REMINDER_SENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REMINDER_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GOOGLE_CALENDAR_SYNCED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GOOGLE_CALENDAR_SYNC_FAILED';

CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMATION_PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
CREATE TYPE "CancellationSource" AS ENUM ('PATIENT', 'DENTIST', 'SYSTEM');
CREATE TYPE "CalendarSyncStatus" AS ENUM ('NOT_CONNECTED', 'PENDING', 'SYNCED', 'FAILED');
CREATE TYPE "AppointmentMessageType" AS ENUM ('CONFIRMATION_REQUEST', 'CONFIRMATION_RESPONSE', 'CANCELLATION_RESPONSE');
CREATE TYPE "AppointmentMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RESPONDED');

ALTER TABLE "Clinic"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN "confirmationLeadMinutes" INTEGER NOT NULL DEFAULT 1440;

CREATE TABLE "AppointmentType" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#087f8c',
  "defaultMinutes" INTEGER NOT NULL DEFAULT 60,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "dentistId" TEXT NOT NULL,
  "appointmentTypeId" TEXT NOT NULL,
  "startAt" TIMESTAMPTZ(3) NOT NULL,
  "endAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "googleCalendarId" TEXT,
  "googleEventId" TEXT,
  "calendarSyncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
  "calendarSyncError" TEXT,
  "confirmationScheduledAt" TIMESTAMPTZ(3),
  "confirmationSentAt" TIMESTAMPTZ(3),
  "confirmedAt" TIMESTAMPTZ(3),
  "cancelledAt" TIMESTAMPTZ(3),
  "cancellationSource" "CancellationSource",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Appointment_valid_range" CHECK ("endAt" > "startAt")
);

CREATE TABLE "AppointmentMessage" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "type" "AppointmentMessageType" NOT NULL,
  "status" "AppointmentMessageStatus" NOT NULL DEFAULT 'QUEUED',
  "sentAt" TIMESTAMPTZ(3),
  "deliveredAt" TIMESTAMPTZ(3),
  "respondedAt" TIMESTAMPTZ(3),
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentHistory" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "changedById" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "previousStartAt" TIMESTAMPTZ(3),
  "previousEndAt" TIMESTAMPTZ(3),
  "newStartAt" TIMESTAMPTZ(3),
  "newEndAt" TIMESTAMPTZ(3),
  "previousStatus" "AppointmentStatus",
  "newStatus" "AppointmentStatus",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarIntegration" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "googleAccountEmail" TEXT,
  "googleCalendarId" TEXT NOT NULL DEFAULT 'primary',
  "googleCalendarName" TEXT,
  "encryptedAccessToken" TEXT,
  "encryptedRefreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ(3),
  "scope" TEXT,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentType_clinicId_name_key" ON "AppointmentType"("clinicId", "name");
CREATE INDEX "AppointmentType_clinicId_active_idx" ON "AppointmentType"("clinicId", "active");
CREATE INDEX "Appointment_clinicId_startAt_endAt_idx" ON "Appointment"("clinicId", "startAt", "endAt");
CREATE INDEX "Appointment_clinicId_patientId_startAt_idx" ON "Appointment"("clinicId", "patientId", "startAt");
CREATE INDEX "Appointment_clinicId_dentistId_startAt_idx" ON "Appointment"("clinicId", "dentistId", "startAt");
CREATE INDEX "Appointment_confirmationScheduledAt_confirmationSentAt_status_idx" ON "Appointment"("confirmationScheduledAt", "confirmationSentAt", "status");
CREATE UNIQUE INDEX "Appointment_clinicId_googleCalendarId_googleEventId_key" ON "Appointment"("clinicId", "googleCalendarId", "googleEventId");
CREATE UNIQUE INDEX "AppointmentMessage_idempotencyKey_key" ON "AppointmentMessage"("idempotencyKey");
CREATE INDEX "AppointmentMessage_clinicId_appointmentId_createdAt_idx" ON "AppointmentMessage"("clinicId", "appointmentId", "createdAt");
CREATE INDEX "AppointmentMessage_status_createdAt_idx" ON "AppointmentMessage"("status", "createdAt");
CREATE INDEX "AppointmentHistory_clinicId_appointmentId_createdAt_idx" ON "AppointmentHistory"("clinicId", "appointmentId", "createdAt");
CREATE UNIQUE INDEX "CalendarIntegration_clinicId_userId_key" ON "CalendarIntegration"("clinicId", "userId");
CREATE INDEX "CalendarIntegration_clinicId_revokedAt_idx" ON "CalendarIntegration"("clinicId", "revokedAt");

ALTER TABLE "AppointmentType" ADD CONSTRAINT "AppointmentType_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentHistory" ADD CONSTRAINT "AppointmentHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentHistory" ADD CONSTRAINT "AppointmentHistory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentHistory" ADD CONSTRAINT "AppointmentHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AppointmentType" ("id", "clinicId", "name", "color", "defaultMinutes", "updatedAt")
SELECT CONCAT('apt-', md5("id" || type_name)), "id", type_name, color, minutes, CURRENT_TIMESTAMP
FROM "Clinic"
CROSS JOIN (VALUES
  ('Consulta/Avaliação', '#087f8c', 60),
  ('Limpeza', '#17815b', 45),
  ('Implante', '#7c3aed', 90),
  ('Canal', '#2563eb', 90),
  ('Extração', '#c43f4c', 60),
  ('Retorno', '#ca8a04', 30),
  ('Outro', '#64748b', 60)
) AS defaults(type_name, color, minutes)
ON CONFLICT ("clinicId", "name") DO NOTHING;

CREATE TYPE "ClinicRole" AS ENUM ('OWNER', 'DENTIST', 'RECEPTIONIST');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
CREATE TYPE "FileCategory" AS ENUM ('RADIOGRAPH', 'PHOTOGRAPH', 'DOCUMENT', 'EXAM', 'OTHER');
CREATE TYPE "AuditAction" AS ENUM ('CLINIC_CREATED', 'PATIENT_CREATED', 'PATIENT_UPDATED', 'FILE_UPLOADED', 'FILE_DELETED', 'PROCEDURE_CREATED', 'PROCEDURE_UPDATED', 'PROFILE_UPDATED');
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "customImageKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Account" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER,
  "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL, CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL);
CREATE TABLE "Clinic" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClinicMember" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "role" "ClinicRole" NOT NULL DEFAULT 'DENTIST', "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Patient" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "fullName" TEXT NOT NULL,
  "cpf" TEXT NOT NULL, "cpfNormalized" TEXT NOT NULL, "phone" TEXT NOT NULL,
  "phoneNormalized" TEXT NOT NULL, "birthDate" DATE NOT NULL, "notes" TEXT,
  "photoFileId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProcedureType" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ProcedureType_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Procedure" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL,
  "procedureTypeId" TEXT NOT NULL, "performedAt" DATE NOT NULL,
  "chargedAmountCents" BIGINT NOT NULL, "costCents" BIGINT NOT NULL DEFAULT 0,
  "description" TEXT, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3), CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProcedureTooth" (
  "procedureId" TEXT NOT NULL, "toothNumber" INTEGER NOT NULL,
  CONSTRAINT "ProcedureTooth_pkey" PRIMARY KEY ("procedureId", "toothNumber")
);
CREATE TABLE "PatientFile" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "patientId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL, "category" "FileCategory" NOT NULL, "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "PatientFile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserPreference" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "theme" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE INDEX "ClinicMember_userId_status_idx" ON "ClinicMember"("userId", "status");
CREATE UNIQUE INDEX "ClinicMember_clinicId_userId_key" ON "ClinicMember"("clinicId", "userId");
CREATE UNIQUE INDEX "Patient_photoFileId_key" ON "Patient"("photoFileId");
CREATE INDEX "Patient_clinicId_fullName_idx" ON "Patient"("clinicId", "fullName");
CREATE INDEX "Patient_clinicId_phoneNormalized_idx" ON "Patient"("clinicId", "phoneNormalized");
CREATE INDEX "Patient_clinicId_archivedAt_createdAt_idx" ON "Patient"("clinicId", "archivedAt", "createdAt");
CREATE UNIQUE INDEX "Patient_clinicId_cpfNormalized_key" ON "Patient"("clinicId", "cpfNormalized");
CREATE INDEX "ProcedureType_clinicId_active_idx" ON "ProcedureType"("clinicId", "active");
CREATE UNIQUE INDEX "ProcedureType_clinicId_name_key" ON "ProcedureType"("clinicId", "name");
CREATE INDEX "Procedure_clinicId_performedAt_idx" ON "Procedure"("clinicId", "performedAt");
CREATE INDEX "Procedure_clinicId_patientId_performedAt_idx" ON "Procedure"("clinicId", "patientId", "performedAt");
CREATE INDEX "Procedure_clinicId_procedureTypeId_idx" ON "Procedure"("clinicId", "procedureTypeId");
CREATE INDEX "ProcedureTooth_toothNumber_idx" ON "ProcedureTooth"("toothNumber");
CREATE UNIQUE INDEX "PatientFile_storageKey_key" ON "PatientFile"("storageKey");
CREATE INDEX "PatientFile_clinicId_patientId_deletedAt_idx" ON "PatientFile"("clinicId", "patientId", "deletedAt");
CREATE INDEX "PatientFile_clinicId_createdAt_idx" ON "PatientFile"("clinicId", "createdAt");
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
CREATE INDEX "AuditLog_clinicId_createdAt_idx" ON "AuditLog"("clinicId", "createdAt");
CREATE INDEX "AuditLog_clinicId_entityType_entityId_idx" ON "AuditLog"("clinicId", "entityType", "entityId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicMember" ADD CONSTRAINT "ClinicMember_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicMember" ADD CONSTRAINT "ClinicMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "PatientFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProcedureType" ADD CONSTRAINT "ProcedureType_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_procedureTypeId_fkey" FOREIGN KEY ("procedureTypeId") REFERENCES "ProcedureType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcedureTooth" ADD CONSTRAINT "ProcedureTooth_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientFile" ADD CONSTRAINT "PatientFile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFile" ADD CONSTRAINT "PatientFile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientFile" ADD CONSTRAINT "PatientFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

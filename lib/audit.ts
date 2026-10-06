import type { AuditAction, Prisma } from "@/generated/prisma/client";

export function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    clinicId: string;
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
  },
) {
  return tx.auditLog.create({ data: input });
}

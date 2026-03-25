import { prisma } from "@/lib/prisma"

type AuditLogInput = {
  entityType: string
  entityId: string
  action: string
  userId?: string | null
  isSystemAction?: boolean
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  ipAddress?: string
}

export async function logAudit(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        userId: input.userId ?? null,
        isSystemAction: input.isSystemAction ?? !input.userId,
        oldValue: (input.oldValue as never) ?? undefined,
        newValue: (input.newValue as never) ?? undefined,
        metadata: (input.metadata as never) ?? {},
        ipAddress: input.ipAddress,
      },
    })
  } catch (error) {
    console.error("Failed to write audit log:", error)
  }
}

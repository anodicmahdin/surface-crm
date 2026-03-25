import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

export const auditLogRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(25),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      action: z.string().optional(),
      userId: z.string().optional(),
      dateRange: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, perPage, entityType, entityId, action, userId, dateRange } = input
      const where: Record<string, unknown> = {}

      if (entityType) where.entityType = entityType
      if (entityId) where.entityId = entityId
      if (action) where.action = action
      if (userId) where.userId = userId
      if (dateRange?.from || dateRange?.to) {
        where.createdAt = {}
        if (dateRange?.from) (where.createdAt as Record<string, unknown>).gte = new Date(dateRange.from)
        if (dateRange?.to) (where.createdAt as Record<string, unknown>).lte = new Date(dateRange.to)
      }

      const [items, totalCount] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where: where as never,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        ctx.prisma.auditLog.count({ where: where as never }),
      ])

      return { items, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage) }
    }),
})

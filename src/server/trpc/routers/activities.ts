import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { ActivityType } from "@prisma/client"

export const activitiesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(25),
      contactId: z.string().optional(),
      dealId: z.string().optional(),
      type: z.nativeEnum(ActivityType).optional(),
      userId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { page, perPage, contactId, dealId, type, userId } = input
      const where: Record<string, unknown> = {}

      if (contactId) where.contactId = contactId
      if (dealId) where.dealId = dealId
      if (type) where.type = type
      if (userId) where.userId = userId

      const [items, totalCount] = await Promise.all([
        ctx.prisma.activity.findMany({
          where: where as never,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true } },
            deal: { select: { id: true, title: true } },
          },
        }),
        ctx.prisma.activity.count({ where: where as never }),
      ])

      return { items, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage) }
    }),

  create: protectedProcedure
    .input(z.object({
      type: z.nativeEnum(ActivityType),
      subject: z.string().optional(),
      body: z.string().optional(),
      direction: z.string().optional(),
      duration: z.number().optional(),
      outcome: z.string().optional(),
      contactId: z.string().optional(),
      dealId: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const activity = await ctx.prisma.activity.create({
        data: {
          type: input.type,
          subject: input.subject,
          body: input.body,
          direction: input.direction,
          duration: input.duration,
          outcome: input.outcome,
          contactId: input.contactId,
          dealId: input.dealId,
          userId: ctx.userId,
          metadata: (input.metadata ?? {}) as never,
        },
      })

      return activity
    }),
})

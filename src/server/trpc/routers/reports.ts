import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

export const reportsRouter = createTRPCRouter({
  dashboardMetrics: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())

    const [
      openDeals,
      wonDealsThisMonth,
      newContactsThisMonth,
      activitiesThisWeek,
    ] = await Promise.all([
      ctx.prisma.deal.aggregate({
        where: { deletedAt: null, closedWon: null },
        _count: true,
        _sum: { value: true },
      }),
      ctx.prisma.deal.aggregate({
        where: {
          closedWon: true,
          actualCloseDate: { gte: startOfMonth },
        },
        _count: true,
        _sum: { value: true },
      }),
      ctx.prisma.contact.count({
        where: { createdAt: { gte: startOfMonth }, deletedAt: null },
      }),
      ctx.prisma.activity.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
    ])

    return {
      openDeals: { count: openDeals._count, value: openDeals._sum.value ?? 0 },
      wonDealsThisMonth: { count: wonDealsThisMonth._count, value: wonDealsThisMonth._sum.value ?? 0 },
      newContactsThisMonth: newContactsThisMonth,
      activitiesThisWeek: activitiesThisWeek,
    }
  }),

  pipelineFunnel: protectedProcedure
    .input(z.object({ pipelineId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { deletedAt: null }
      if (input.pipelineId) where.pipelineId = input.pipelineId

      const stages = await ctx.prisma.pipelineStage.findMany({
        where: input.pipelineId ? { pipelineId: input.pipelineId } : {},
        include: {
          _count: { select: { deals: true } },
          deals: {
            where: { deletedAt: null },
            select: { value: true },
          },
        },
        orderBy: { order: "asc" },
      })

      return stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        count: stage._count.deals,
        value: stage.deals.reduce((sum, d) => sum + (d.value ?? 0), 0),
      }))
    }),

  dealsClosingThisMonth: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return ctx.prisma.deal.findMany({
      where: {
        deletedAt: null,
        closedWon: null,
        expectedCloseDate: { gte: now, lte: endOfMonth },
      },
      include: {
        stage: true,
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { value: "desc" },
      take: 10,
    })
  }),
})

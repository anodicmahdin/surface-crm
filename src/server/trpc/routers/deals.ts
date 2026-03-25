import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { logAudit } from "@/server/services/audit"
import { TRPCError } from "@trpc/server"

export const dealsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(25),
        pipelineId: z.string().optional(),
        sort: z.object({
          field: z.string(),
          direction: z.enum(["asc", "desc"]),
        }).optional(),
        filters: z.object({
          stageId: z.array(z.string()).optional(),
          ownerId: z.array(z.string()).optional(),
          search: z.string().optional(),
          minValue: z.number().optional(),
          maxValue: z.number().optional(),
        }).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, perPage, sort, filters, pipelineId } = input
      const where: Record<string, unknown> = { deletedAt: null }

      if (pipelineId) where.pipelineId = pipelineId
      if (filters?.stageId?.length) where.stageId = { in: filters.stageId }
      if (filters?.ownerId?.length) where.ownerId = { in: filters.ownerId }
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: "insensitive" } },
          { contact: { firstName: { contains: filters.search, mode: "insensitive" } } },
          { company: { name: { contains: filters.search, mode: "insensitive" } } },
        ]
      }
      if (filters?.minValue !== undefined || filters?.maxValue !== undefined) {
        where.value = {}
        if (filters?.minValue !== undefined) (where.value as Record<string, unknown>).gte = filters.minValue
        if (filters?.maxValue !== undefined) (where.value as Record<string, unknown>).lte = filters.maxValue
      }

      const orderBy = sort ? { [sort.field]: sort.direction } : { createdAt: "desc" }

      const [items, totalCount] = await Promise.all([
        ctx.prisma.deal.findMany({
          where: where as never,
          include: {
            stage: true,
            pipeline: true,
            contact: { select: { id: true, firstName: true, lastName: true } },
            company: { select: { id: true, name: true } },
          },
          orderBy: orderBy as never,
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        ctx.prisma.deal.count({ where: where as never }),
      ])

      return { items, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage) }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const deal = await ctx.prisma.deal.findUnique({
        where: { id: input.id },
        include: {
          stage: true,
          pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
          contact: true,
          company: true,
          activities: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      })
      if (!deal) throw new TRPCError({ code: "NOT_FOUND" })
      return deal
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      value: z.number().optional(),
      currency: z.string().default("USD"),
      stageId: z.string(),
      pipelineId: z.string(),
      probability: z.number().min(0).max(100).optional(),
      expectedCloseDate: z.string().optional(),
      ownerId: z.string().optional(),
      contactId: z.string().optional(),
      companyId: z.string().optional(),
      customFields: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const maxPosition = await ctx.prisma.deal.aggregate({
        where: { stageId: input.stageId, deletedAt: null },
        _max: { position: true },
      })

      const deal = await ctx.prisma.deal.create({
        data: {
          title: input.title,
          value: input.value,
          currency: input.currency,
          stageId: input.stageId,
          pipelineId: input.pipelineId,
          probability: input.probability,
          expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
          ownerId: input.ownerId,
          contactId: input.contactId,
          companyId: input.companyId,
          position: (maxPosition._max.position ?? -1) + 1,
          customFields: (input.customFields ?? {}) as never,
        },
        include: { stage: true, pipeline: true },
      })

      await logAudit({
        entityType: "deal",
        entityId: deal.id,
        action: "created",
        userId: ctx.userId,
        newValue: { title: deal.title, value: deal.value, stage: deal.stage.name },
      })

      return deal
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      value: z.number().optional(),
      stageId: z.string().optional(),
      probability: z.number().min(0).max(100).optional(),
      expectedCloseDate: z.string().nullable().optional(),
      ownerId: z.string().nullable().optional(),
      contactId: z.string().nullable().optional(),
      companyId: z.string().nullable().optional(),
      customFields: z.record(z.unknown()).optional(),
      lostReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const old = await ctx.prisma.deal.findUnique({
        where: { id },
        include: { stage: true },
      })
      if (!old) throw new TRPCError({ code: "NOT_FOUND" })

      const updateData: Record<string, unknown> = { ...data }
      if (data.expectedCloseDate !== undefined) {
        updateData.expectedCloseDate = data.expectedCloseDate ? new Date(data.expectedCloseDate) : null
      }
      if (data.customFields) {
        updateData.customFields = data.customFields
      }

      const deal = await ctx.prisma.deal.update({
        where: { id },
        data: updateData as never,
        include: { stage: true },
      })

      if (data.stageId && data.stageId !== old.stageId) {
        await ctx.prisma.activity.create({
          data: {
            type: "STAGE_CHANGE",
            subject: `Stage: ${old.stage.name} → ${deal.stage.name}`,
            dealId: id,
            contactId: old.contactId,
            userId: ctx.userId,
            metadata: { oldStageId: old.stageId, newStageId: data.stageId },
          },
        })

        await logAudit({
          entityType: "deal",
          entityId: id,
          action: "stage_changed",
          userId: ctx.userId,
          oldValue: { stageId: old.stageId, stageName: old.stage.name },
          newValue: { stageId: deal.stageId, stageName: deal.stage.name },
        })
      }

      return deal
    }),

  moveStage: protectedProcedure
    .input(z.object({
      dealId: z.string(),
      newStageId: z.string(),
      newPosition: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const old = await ctx.prisma.deal.findUnique({
        where: { id: input.dealId },
        include: { stage: true },
      })
      if (!old) throw new TRPCError({ code: "NOT_FOUND" })

      const newStage = await ctx.prisma.pipelineStage.findUnique({
        where: { id: input.newStageId },
      })
      if (!newStage) throw new TRPCError({ code: "NOT_FOUND" })

      const deal = await ctx.prisma.deal.update({
        where: { id: input.dealId },
        data: {
          stageId: input.newStageId,
          position: input.newPosition,
          probability: newStage.probability ?? old.probability,
          closedWon: newStage.isClosedWon ? true : newStage.isClosedLost ? false : old.closedWon,
          actualCloseDate: (newStage.isClosedWon || newStage.isClosedLost) ? new Date() : old.actualCloseDate,
        },
        include: { stage: true },
      })

      if (old.stageId !== input.newStageId) {
        await ctx.prisma.activity.create({
          data: {
            type: "STAGE_CHANGE",
            subject: `Stage: ${old.stage.name} → ${deal.stage.name}`,
            dealId: input.dealId,
            contactId: old.contactId,
            userId: ctx.userId,
          },
        })

        await logAudit({
          entityType: "deal",
          entityId: input.dealId,
          action: "stage_changed",
          userId: ctx.userId,
          oldValue: { stageId: old.stageId, stageName: old.stage.name },
          newValue: { stageId: deal.stageId, stageName: deal.stage.name },
        })
      }

      return deal
    }),

  markWon: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deal = await ctx.prisma.deal.findUnique({
        where: { id: input.id },
        include: { pipeline: { include: { stages: true } } },
      })
      if (!deal) throw new TRPCError({ code: "NOT_FOUND" })

      const wonStage = deal.pipeline.stages.find((s) => s.isClosedWon)
      if (!wonStage) throw new TRPCError({ code: "BAD_REQUEST", message: "No Closed Won stage" })

      const updated = await ctx.prisma.deal.update({
        where: { id: input.id },
        data: {
          closedWon: true,
          actualCloseDate: new Date(),
          stageId: wonStage.id,
          probability: 100,
        },
      })

      await logAudit({
        entityType: "deal",
        entityId: input.id,
        action: "won",
        userId: ctx.userId,
        newValue: { closedWon: true },
      })

      return updated
    }),

  markLost: protectedProcedure
    .input(z.object({ id: z.string(), lostReason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const deal = await ctx.prisma.deal.findUnique({
        where: { id: input.id },
        include: { pipeline: { include: { stages: true } } },
      })
      if (!deal) throw new TRPCError({ code: "NOT_FOUND" })

      const lostStage = deal.pipeline.stages.find((s) => s.isClosedLost)
      if (!lostStage) throw new TRPCError({ code: "BAD_REQUEST", message: "No Closed Lost stage" })

      const updated = await ctx.prisma.deal.update({
        where: { id: input.id },
        data: {
          closedWon: false,
          actualCloseDate: new Date(),
          stageId: lostStage.id,
          probability: 0,
          lostReason: input.lostReason,
        },
      })

      await logAudit({
        entityType: "deal",
        entityId: input.id,
        action: "lost",
        userId: ctx.userId,
        newValue: { closedWon: false, lostReason: input.lostReason },
      })

      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.deal.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })

      await logAudit({
        entityType: "deal",
        entityId: input.id,
        action: "deleted",
        userId: ctx.userId,
      })

      return { success: true }
    }),
})

import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { logAudit } from "@/server/services/audit"

export const pipelinesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.pipeline.findMany({
      include: {
        stages: { orderBy: { order: "asc" } },
        _count: { select: { deals: true } },
      },
      orderBy: { createdAt: "asc" },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.pipeline.findUnique({
        where: { id: input.id },
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: {
              deals: {
                where: { deletedAt: null },
                include: {
                  contact: { select: { id: true, firstName: true, lastName: true } },
                  company: { select: { id: true, name: true } },
                },
                orderBy: { position: "asc" },
              },
              _count: { select: { deals: true } },
            },
          },
        },
      })
    }),

  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const pipeline = await ctx.prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            deals: {
              where: { deletedAt: null },
              include: {
                contact: { select: { id: true, firstName: true, lastName: true } },
                company: { select: { id: true, name: true } },
              },
              orderBy: { position: "asc" },
            },
            _count: { select: { deals: true } },
          },
        },
      },
    })
    return pipeline
  }),

  updateStages: protectedProcedure
    .input(z.object({
      pipelineId: z.string(),
      stages: z.array(z.object({
        id: z.string().optional(),
        name: z.string(),
        color: z.string().optional(),
        order: z.number(),
        probability: z.number().optional(),
        isClosedWon: z.boolean().default(false),
        isClosedLost: z.boolean().default(false),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const stage of input.stages) {
        if (stage.id) {
          await ctx.prisma.pipelineStage.update({
            where: { id: stage.id },
            data: {
              name: stage.name,
              color: stage.color,
              order: stage.order,
              probability: stage.probability,
              isClosedWon: stage.isClosedWon,
              isClosedLost: stage.isClosedLost,
            },
          })
        } else {
          await ctx.prisma.pipelineStage.create({
            data: {
              ...stage,
              pipelineId: input.pipelineId,
            },
          })
        }
      }

      await logAudit({
        entityType: "pipeline",
        entityId: input.pipelineId,
        action: "stages_updated",
        userId: ctx.userId,
      })

      return { success: true }
    }),
})

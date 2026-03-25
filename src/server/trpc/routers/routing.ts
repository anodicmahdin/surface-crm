import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { AssignmentType } from "@prisma/client"
import { logAudit } from "@/server/services/audit"

export const routingRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.routingRule.findMany({
      orderBy: { priority: "desc" },
    })
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.routingRule.findUnique({ where: { id: input.id } })
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      priority: z.number().default(0),
      conditions: z.record(z.unknown()),
      assignmentType: z.nativeEnum(AssignmentType),
      assignmentConfig: z.record(z.unknown()),
      fallbackOwnerId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.routingRule.create({
        data: {
          name: input.name,
          description: input.description,
          priority: input.priority,
          conditions: input.conditions as never,
          assignmentType: input.assignmentType,
          assignmentConfig: input.assignmentConfig as never,
          fallbackOwnerId: input.fallbackOwnerId,
          createdBy: ctx.userId,
        },
      })

      await logAudit({
        entityType: "routing",
        entityId: rule.id,
        action: "created",
        userId: ctx.userId,
        newValue: { name: rule.name },
      })

      return rule
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      priority: z.number().optional(),
      conditions: z.record(z.unknown()).optional(),
      assignmentType: z.nativeEnum(AssignmentType).optional(),
      assignmentConfig: z.record(z.unknown()).optional(),
      fallbackOwnerId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.routingRule.update({ where: { id }, data: data as never })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.routingRule.delete({ where: { id: input.id } })
      return { success: true }
    }),
})

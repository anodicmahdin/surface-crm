import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { TriggerType, ActionType } from "@prisma/client"
import { logAudit } from "@/server/services/audit"

export const automationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      const { page, perPage } = input
      const [items, totalCount] = await Promise.all([
        ctx.prisma.automationRule.findMany({
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        ctx.prisma.automationRule.count(),
      ])
      return { items, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage) }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.automationRule.findUnique({ where: { id: input.id } })
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      triggerType: z.nativeEnum(TriggerType),
      triggerConfig: z.record(z.unknown()),
      conditions: z.array(z.unknown()).optional(),
      actionType: z.nativeEnum(ActionType),
      actionConfig: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.automationRule.create({
        data: {
          name: input.name,
          description: input.description,
          triggerType: input.triggerType,
          triggerConfig: input.triggerConfig as never,
          conditions: (input.conditions ?? []) as never,
          actionType: input.actionType,
          actionConfig: input.actionConfig as never,
          createdBy: ctx.userId,
        },
      })

      await logAudit({
        entityType: "automation",
        entityId: rule.id,
        action: "created",
        userId: ctx.userId,
        newValue: { name: rule.name, triggerType: rule.triggerType },
      })

      return rule
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      triggerType: z.nativeEnum(TriggerType).optional(),
      triggerConfig: z.record(z.unknown()).optional(),
      conditions: z.array(z.unknown()).optional(),
      actionType: z.nativeEnum(ActionType).optional(),
      actionConfig: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const rule = await ctx.prisma.automationRule.update({
        where: { id },
        data: data as never,
      })

      await logAudit({
        entityType: "automation",
        entityId: id,
        action: "updated",
        userId: ctx.userId,
        newValue: data as Record<string, unknown>,
      })

      return rule
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.automationRule.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
      return rule
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.automationRule.delete({ where: { id: input.id } })
      await logAudit({
        entityType: "automation",
        entityId: input.id,
        action: "deleted",
        userId: ctx.userId,
      })
      return { success: true }
    }),
})

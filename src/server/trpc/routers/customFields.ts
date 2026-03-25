import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { EntityType, FieldType } from "@prisma/client"

export const customFieldsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ entityType: z.nativeEnum(EntityType).optional() }))
    .query(async ({ ctx, input }) => {
      const where = input.entityType ? { entityType: input.entityType } : {}
      return ctx.prisma.customFieldDefinition.findMany({
        where,
        orderBy: [{ entityType: "asc" }, { order: "asc" }],
      })
    }),

  create: protectedProcedure
    .input(z.object({
      entityType: z.nativeEnum(EntityType),
      fieldName: z.string().min(1),
      label: z.string().min(1),
      fieldType: z.nativeEnum(FieldType),
      options: z.array(z.string()).optional(),
      isRequired: z.boolean().default(false),
      defaultValue: z.string().optional(),
      order: z.number().default(0),
      groupName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customFieldDefinition.create({
        data: {
          entityType: input.entityType,
          fieldName: input.fieldName,
          label: input.label,
          fieldType: input.fieldType,
          options: (input.options ?? undefined) as never,
          isRequired: input.isRequired,
          defaultValue: input.defaultValue,
          order: input.order,
          groupName: input.groupName,
          createdBy: ctx.userId,
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().optional(),
      options: z.array(z.string()).optional(),
      isRequired: z.boolean().optional(),
      defaultValue: z.string().optional(),
      order: z.number().optional(),
      groupName: z.string().optional(),
      isVisible: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.customFieldDefinition.update({
        where: { id },
        data: { ...data, options: (data.options ?? undefined) as never },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.customFieldDefinition.delete({ where: { id: input.id } })
      return { success: true }
    }),
})

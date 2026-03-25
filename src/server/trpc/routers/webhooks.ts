import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { randomBytes } from "crypto"

export const webhooksRouter = createTRPCRouter({
  listEndpoints: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: "desc" },
    })
  }),

  createEndpoint: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      description: z.string().optional(),
      events: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.webhookEndpoint.create({
        data: {
          ...input,
          secret: randomBytes(32).toString("hex"),
          createdBy: ctx.userId,
        },
      })
    }),

  updateEndpoint: protectedProcedure
    .input(z.object({
      id: z.string(),
      url: z.string().url().optional(),
      description: z.string().optional(),
      events: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.webhookEndpoint.update({ where: { id }, data })
    }),

  deleteEndpoint: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.webhookEndpoint.delete({ where: { id: input.id } })
      return { success: true }
    }),

  deliveryHistory: protectedProcedure
    .input(z.object({
      endpointId: z.string(),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      const { endpointId, page, perPage } = input
      const [items, totalCount] = await Promise.all([
        ctx.prisma.webhookDelivery.findMany({
          where: { endpointId },
          orderBy: { deliveredAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        ctx.prisma.webhookDelivery.count({ where: { endpointId } }),
      ])
      return { items, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage) }
    }),
})

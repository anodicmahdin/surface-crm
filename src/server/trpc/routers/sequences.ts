import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { SequenceStatus, SequenceStepType, EnrollmentStatus } from "@prisma/client"
import { logAudit } from "@/server/services/audit"
import { TRPCError } from "@trpc/server"

export const sequencesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(25),
    }))
    .query(async ({ ctx, input }) => {
      const { page, perPage } = input
      const [items, totalCount] = await Promise.all([
        ctx.prisma.sequence.findMany({
          include: {
            _count: { select: { steps: true, enrollments: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        ctx.prisma.sequence.count(),
      ])
      return { items, totalCount, page, perPage, totalPages: Math.ceil(totalCount / perPage) }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.sequence.findUnique({
        where: { id: input.id },
        include: {
          steps: { orderBy: { order: "asc" } },
          enrollments: {
            include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          _count: { select: { enrollments: true } },
        },
      })
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      settings: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.sequence.create({
        data: { name: input.name, description: input.description, ownerId: ctx.userId, settings: (input.settings ?? {}) as never },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.nativeEnum(SequenceStatus).optional(),
      settings: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.sequence.update({ where: { id }, data: data as never })
    }),

  addStep: protectedProcedure
    .input(z.object({
      sequenceId: z.string(),
      type: z.nativeEnum(SequenceStepType),
      order: z.number(),
      subject: z.string().optional(),
      body: z.string().optional(),
      waitDays: z.number().optional(),
      waitHours: z.number().optional(),
      metadata: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.sequenceStep.updateMany({
        where: { sequenceId: input.sequenceId, order: { gte: input.order } },
        data: { order: { increment: 1 } },
      })
      return ctx.prisma.sequenceStep.create({
        data: { ...input, metadata: (input.metadata ?? {}) as never },
      })
    }),

  updateStep: protectedProcedure
    .input(z.object({
      id: z.string(),
      subject: z.string().optional(),
      body: z.string().optional(),
      waitDays: z.number().optional(),
      waitHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.sequenceStep.update({ where: { id }, data })
    }),

  deleteStep: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.sequenceStep.delete({ where: { id: input.id } })
      return { success: true }
    }),

  enroll: protectedProcedure
    .input(z.object({
      sequenceId: z.string(),
      contactId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.sequenceEnrollment.findUnique({
        where: { sequenceId_contactId: { sequenceId: input.sequenceId, contactId: input.contactId } },
      })
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already enrolled" })

      const contact = await ctx.prisma.contact.findUnique({ where: { id: input.contactId } })
      if (!contact?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Contact must have email" })

      const enrollment = await ctx.prisma.sequenceEnrollment.create({
        data: {
          sequenceId: input.sequenceId,
          contactId: input.contactId,
          enrolledBy: ctx.userId,
          nextStepAt: new Date(),
        },
      })

      await logAudit({
        entityType: "sequence",
        entityId: input.sequenceId,
        action: "enrolled",
        userId: ctx.userId,
        newValue: { contactId: input.contactId },
      })

      return enrollment
    }),

  updateEnrollment: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.nativeEnum(EnrollmentStatus).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.sequenceEnrollment.update({ where: { id }, data })
    }),
})

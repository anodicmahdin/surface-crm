import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { ContactStatus, EnrichmentStatus } from "@prisma/client"
import { logAudit } from "@/server/services/audit"
import { TRPCError } from "@trpc/server"

const contactCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  source: z.string().optional(),
  status: z.nativeEnum(ContactStatus).optional(),
  ownerId: z.string().optional(),
  companyId: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
})

const contactUpdateSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  source: z.string().optional(),
  status: z.nativeEnum(ContactStatus).optional(),
  ownerId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  customFields: z.record(z.unknown()).optional(),
  leadScore: z.number().optional(),
})

export const contactsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(25),
        sort: z
          .object({
            field: z.string(),
            direction: z.enum(["asc", "desc"]),
          })
          .optional(),
        filters: z
          .object({
            status: z.array(z.nativeEnum(ContactStatus)).optional(),
            ownerId: z.array(z.string()).optional(),
            source: z.array(z.string()).optional(),
            tags: z.array(z.string()).optional(),
            search: z.string().optional(),
            enrichmentStatus: z.nativeEnum(EnrichmentStatus).optional(),
            hasEmail: z.boolean().optional(),
            dateRange: z
              .object({
                from: z.string().optional(),
                to: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, perPage, sort, filters } = input
      const where: Record<string, unknown> = { deletedAt: null }

      if (filters?.status?.length) {
        where.status = { in: filters.status }
      }
      if (filters?.ownerId?.length) {
        where.ownerId = { in: filters.ownerId }
      }
      if (filters?.source?.length) {
        where.source = { in: filters.source }
      }
      if (filters?.enrichmentStatus) {
        where.enrichmentStatus = filters.enrichmentStatus
      }
      if (filters?.hasEmail === true) {
        where.email = { not: null }
      }
      if (filters?.hasEmail === false) {
        where.email = null
      }
      if (filters?.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          {
            company: {
              name: { contains: filters.search, mode: "insensitive" },
            },
          },
        ]
      }
      if (filters?.dateRange?.from || filters?.dateRange?.to) {
        where.createdAt = {}
        if (filters.dateRange?.from) {
          ;(where.createdAt as Record<string, unknown>).gte = new Date(
            filters.dateRange.from
          )
        }
        if (filters.dateRange?.to) {
          ;(where.createdAt as Record<string, unknown>).lte = new Date(
            filters.dateRange.to
          )
        }
      }

      const orderBy: Record<string, string> = sort
        ? { [sort.field]: sort.direction }
        : { createdAt: "desc" }

      const [items, totalCount] = await Promise.all([
        ctx.prisma.contact.findMany({
          where: where as never,
          include: {
            company: { select: { id: true, name: true, domain: true } },
            tags: { include: { tag: true } },
          },
          orderBy: orderBy as never,
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        ctx.prisma.contact.count({ where: where as never }),
      ])

      return {
        items,
        totalCount,
        page,
        perPage,
        totalPages: Math.ceil(totalCount / perPage),
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const contact = await ctx.prisma.contact.findUnique({
        where: { id: input.id },
        include: {
          company: true,
          deals: {
            include: { stage: true, pipeline: true },
            where: { deletedAt: null },
          },
          tags: { include: { tag: true } },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          sequenceEnrollments: {
            include: { sequence: true },
          },
        },
      })

      if (!contact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
      }

      return contact
    }),

  create: protectedProcedure
    .input(contactCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...contactData } = input

      const contact = await ctx.prisma.contact.create({
        data: {
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email || null,
          phone: contactData.phone,
          title: contactData.title,
          linkedinUrl: contactData.linkedinUrl || null,
          source: contactData.source,
          status: contactData.status,
          ownerId: contactData.ownerId,
          companyId: contactData.companyId,
          customFields: (contactData.customFields ?? {}) as never,
        },
      })

      if (tags?.length) {
        for (const tagName of tags) {
          const tag = await ctx.prisma.tag.upsert({
            where: { name: tagName },
            create: { name: tagName },
            update: {},
          })
          await ctx.prisma.contactTag.create({
            data: { contactId: contact.id, tagId: tag.id },
          })
        }
      }

      await logAudit({
        entityType: "contact",
        entityId: contact.id,
        action: "created",
        userId: ctx.userId,
        newValue: { firstName: contact.firstName, lastName: contact.lastName, email: contact.email },
        metadata: { source: "manual" },
      })

      return contact
    }),

  update: protectedProcedure
    .input(contactUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const oldContact = await ctx.prisma.contact.findUnique({ where: { id } })
      if (!oldContact) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" })
      }

      const updateData: Record<string, unknown> = { ...data }
      if (data.email === "") updateData.email = null
      if (data.linkedinUrl === "") updateData.linkedinUrl = null

      const contact = await ctx.prisma.contact.update({
        where: { id },
        data: updateData as never,
      })

      const changedFields: Record<string, unknown> = {}
      const oldFields: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && (oldContact as Record<string, unknown>)[key] !== value) {
          changedFields[key] = value
          oldFields[key] = (oldContact as Record<string, unknown>)[key]
        }
      }

      if (Object.keys(changedFields).length > 0) {
        await logAudit({
          entityType: "contact",
          entityId: id,
          action: "updated",
          userId: ctx.userId,
          oldValue: oldFields,
          newValue: changedFields,
          metadata: { source: "manual_edit" },
        })
      }

      return contact
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.contact.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })

      await logAudit({
        entityType: "contact",
        entityId: input.id,
        action: "deleted",
        userId: ctx.userId,
        metadata: { source: "manual" },
      })

      return { success: true }
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        status: z.nativeEnum(ContactStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.contact.updateMany({
        where: { id: { in: input.ids } },
        data: { status: input.status },
      })

      for (const id of input.ids) {
        await logAudit({
          entityType: "contact",
          entityId: id,
          action: "updated",
          userId: ctx.userId,
          newValue: { status: input.status },
          metadata: { source: "bulk_action" },
        })
      }

      return { success: true, count: input.ids.length }
    }),

  bulkAssignOwner: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        ownerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.contact.updateMany({
        where: { id: { in: input.ids } },
        data: { ownerId: input.ownerId },
      })

      return { success: true, count: input.ids.length }
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.contact.updateMany({
        where: { id: { in: input.ids } },
        data: { deletedAt: new Date() },
      })

      return { success: true, count: input.ids.length }
    }),

  importCsv: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            title: z.string().optional(),
            companyName: z.string().optional(),
            linkedinUrl: z.string().optional(),
            source: z.string().optional(),
            status: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let created = 0
      const errors: { row: number; error: string }[] = []
      const validStatuses = ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "NURTURING", "CUSTOMER", "CHURNED"]

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i]
        try {
          if (!row.firstName?.trim() || !row.lastName?.trim()) {
            errors.push({ row: i + 1, error: "First name and last name are required" })
            continue
          }

          let companyId: string | undefined
          if (row.companyName?.trim()) {
            let company = await ctx.prisma.company.findFirst({
              where: { name: { equals: row.companyName.trim(), mode: "insensitive" } },
            })
            if (!company) {
              company = await ctx.prisma.company.create({
                data: { name: row.companyName.trim() },
              })
            }
            companyId = company.id
          }

          const statusRaw = row.status?.trim().toUpperCase()
          const status = validStatuses.includes(statusRaw ?? "") ? (statusRaw as ContactStatus) : ContactStatus.NEW

          await ctx.prisma.contact.create({
            data: {
              firstName: row.firstName.trim(),
              lastName: row.lastName.trim(),
              email: row.email?.trim() || null,
              phone: row.phone?.trim() || null,
              title: row.title?.trim() || null,
              linkedinUrl: row.linkedinUrl?.trim() || null,
              source: row.source?.trim() || "csv_import",
              status,
              companyId,
            },
          })
          created++
        } catch (e) {
          errors.push({ row: i + 1, error: e instanceof Error ? e.message : "Unknown error" })
        }
      }

      await logAudit({
        entityType: "contact",
        entityId: "bulk",
        action: "created",
        userId: ctx.userId,
        metadata: { source: "csv_import", created, errors: errors.length },
      })

      return { created, errors, total: input.rows.length }
    }),
})

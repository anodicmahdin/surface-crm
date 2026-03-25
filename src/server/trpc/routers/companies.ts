import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { logAudit } from "@/server/services/audit"
import { TRPCError } from "@trpc/server"

export const companiesRouter = createTRPCRouter({
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
            search: z.string().optional(),
            industry: z.array(z.string()).optional(),
            headcount: z.array(z.string()).optional(),
            fundingStage: z.array(z.string()).optional(),
            hasDomain: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, perPage, sort, filters } = input
      const where: Record<string, unknown> = {}

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { domain: { contains: filters.search, mode: "insensitive" } },
        ]
      }
      if (filters?.industry?.length) {
        where.industry = { in: filters.industry }
      }
      if (filters?.headcount?.length) {
        where.headcount = { in: filters.headcount }
      }
      if (filters?.fundingStage?.length) {
        where.fundingStage = { in: filters.fundingStage }
      }
      if (filters?.hasDomain === true) {
        where.domain = { not: null }
      }

      const orderBy = sort
        ? { [sort.field]: sort.direction }
        : { createdAt: "desc" }

      const [items, totalCount] = await Promise.all([
        ctx.prisma.company.findMany({
          where: where as never,
          include: {
            _count: {
              select: { contacts: true, deals: true },
            },
          },
          orderBy: orderBy as never,
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        ctx.prisma.company.count({ where: where as never }),
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
      const company = await ctx.prisma.company.findUnique({
        where: { id: input.id },
        include: {
          contacts: {
            where: { deletedAt: null },
            include: { tags: { include: { tag: true } } },
          },
          deals: {
            where: { deletedAt: null },
            include: { stage: true, pipeline: true },
          },
          _count: {
            select: { contacts: true, deals: true },
          },
        },
      })

      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" })
      }

      return company
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        domain: z.string().optional(),
        industry: z.string().optional(),
        headcount: z.string().optional(),
        annualRevenue: z.string().optional(),
        fundingStage: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        linkedinUrl: z.string().optional(),
        websiteUrl: z.string().optional(),
        customFields: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const company = await ctx.prisma.company.create({
        data: {
          name: input.name,
          domain: input.domain,
          industry: input.industry,
          headcount: input.headcount,
          annualRevenue: input.annualRevenue,
          fundingStage: input.fundingStage,
          location: input.location,
          description: input.description,
          linkedinUrl: input.linkedinUrl,
          websiteUrl: input.websiteUrl,
          customFields: (input.customFields ?? {}) as never,
        },
      })

      await logAudit({
        entityType: "company",
        entityId: company.id,
        action: "created",
        userId: ctx.userId,
        newValue: { name: company.name, domain: company.domain },
      })

      return company
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        headcount: z.string().optional(),
        annualRevenue: z.string().optional(),
        fundingStage: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        linkedinUrl: z.string().optional(),
        websiteUrl: z.string().optional(),
        customFields: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const old = await ctx.prisma.company.findUnique({ where: { id } })
      if (!old) throw new TRPCError({ code: "NOT_FOUND" })

      const company = await ctx.prisma.company.update({
        where: { id },
        data: data as never,
      })

      await logAudit({
        entityType: "company",
        entityId: id,
        action: "updated",
        userId: ctx.userId,
        oldValue: { name: old.name },
        newValue: { name: company.name },
      })

      return company
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { domain: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, domain: true },
        take: 10,
      })
    }),

  importCsv: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            name: z.string(),
            domain: z.string().optional(),
            industry: z.string().optional(),
            headcount: z.string().optional(),
            annualRevenue: z.string().optional(),
            fundingStage: z.string().optional(),
            location: z.string().optional(),
            description: z.string().optional(),
            linkedinUrl: z.string().optional(),
            websiteUrl: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let created = 0
      let updated = 0
      const errors: { row: number; error: string }[] = []

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i]
        try {
          if (!row.name?.trim()) {
            errors.push({ row: i + 1, error: "Company name is required" })
            continue
          }

          const domain = row.domain?.trim() || null

          if (domain) {
            await ctx.prisma.company.upsert({
              where: { domain },
              create: {
                name: row.name.trim(),
                domain,
                industry: row.industry?.trim() || null,
                headcount: row.headcount?.trim() || null,
                annualRevenue: row.annualRevenue?.trim() || null,
                fundingStage: row.fundingStage?.trim() || null,
                location: row.location?.trim() || null,
                description: row.description?.trim() || null,
                linkedinUrl: row.linkedinUrl?.trim() || null,
                websiteUrl: row.websiteUrl?.trim() || null,
              },
              update: {
                name: row.name.trim(),
                industry: row.industry?.trim() || undefined,
                headcount: row.headcount?.trim() || undefined,
                annualRevenue: row.annualRevenue?.trim() || undefined,
                fundingStage: row.fundingStage?.trim() || undefined,
                location: row.location?.trim() || undefined,
                description: row.description?.trim() || undefined,
                linkedinUrl: row.linkedinUrl?.trim() || undefined,
                websiteUrl: row.websiteUrl?.trim() || undefined,
              },
            })
            updated++
          } else {
            await ctx.prisma.company.create({
              data: {
                name: row.name.trim(),
                industry: row.industry?.trim() || null,
                headcount: row.headcount?.trim() || null,
                annualRevenue: row.annualRevenue?.trim() || null,
                fundingStage: row.fundingStage?.trim() || null,
                location: row.location?.trim() || null,
                description: row.description?.trim() || null,
                linkedinUrl: row.linkedinUrl?.trim() || null,
                websiteUrl: row.websiteUrl?.trim() || null,
              },
            })
            created++
          }
        } catch (e) {
          errors.push({ row: i + 1, error: e instanceof Error ? e.message : "Unknown error" })
        }
      }

      await logAudit({
        entityType: "company",
        entityId: "bulk",
        action: "created",
        userId: ctx.userId,
        metadata: { source: "csv_import", created, updated, errors: errors.length },
      })

      return { created, updated, errors, total: input.rows.length }
    }),
})

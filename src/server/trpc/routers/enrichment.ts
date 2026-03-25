import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { enrichContact } from "@/server/services/enrichment"
import { logAudit } from "@/server/services/audit"
import { TRPCError } from "@trpc/server"

export const enrichmentRouter = createTRPCRouter({
  enrichSingle: protectedProcedure
    .input(z.object({ contactId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.prisma.contact.findUnique({
        where: { id: input.contactId },
      })
      if (!contact) throw new TRPCError({ code: "NOT_FOUND" })
      if (!contact.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Contact has no email" })

      const result = await enrichContact(contact.email)

      if (result) {
        const updateData: Record<string, unknown> = {
          enrichmentData: result.data,
          enrichmentSource: result.source,
          enrichmentStatus: "ENRICHED",
          lastEnrichedAt: new Date(),
        }

        if (result.data.title && !contact.title) updateData.title = result.data.title
        if (result.data.phone && !contact.phone) updateData.phone = result.data.phone
        if (result.data.linkedinUrl && !contact.linkedinUrl) updateData.linkedinUrl = result.data.linkedinUrl

        if (result.data.companyDomain) {
          let company = await ctx.prisma.company.findUnique({
            where: { domain: result.data.companyDomain },
          })

          if (!company && result.data.company) {
            company = await ctx.prisma.company.create({
              data: {
                name: result.data.company,
                domain: result.data.companyDomain,
                industry: result.data.industry,
                headcount: result.data.headcount,
                fundingStage: result.data.fundingStage,
                annualRevenue: result.data.annualRevenue,
              },
            })
          }

          if (company && !contact.companyId) {
            updateData.companyId = company.id
          }
        }

        await ctx.prisma.contact.update({
          where: { id: input.contactId },
          data: updateData as never,
        })

        await logAudit({
          entityType: "contact",
          entityId: input.contactId,
          action: "enriched",
          userId: ctx.userId,
          newValue: { source: result.source, fields: Object.keys(result.data) },
        })

        return { success: true, source: result.source }
      }

      await ctx.prisma.contact.update({
        where: { id: input.contactId },
        data: { enrichmentStatus: "FAILED", lastEnrichedAt: new Date() },
      })

      return { success: false }
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [total, enriched, failed, stale, pending] = await Promise.all([
      ctx.prisma.contact.count({ where: { deletedAt: null } }),
      ctx.prisma.contact.count({ where: { enrichmentStatus: "ENRICHED", deletedAt: null } }),
      ctx.prisma.contact.count({ where: { enrichmentStatus: "FAILED", deletedAt: null } }),
      ctx.prisma.contact.count({ where: { enrichmentStatus: "STALE", deletedAt: null } }),
      ctx.prisma.contact.count({ where: { enrichmentStatus: "PENDING", deletedAt: null } }),
    ])

    return { total, enriched, failed, stale, pending }
  }),
})

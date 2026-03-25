import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"

export const searchRouter = createTRPCRouter({
  global: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const q = input.query

      const [contacts, companies, deals] = await Promise.all([
        ctx.prisma.contact.findMany({
          where: {
            deletedAt: null,
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          take: 5,
        }),
        ctx.prisma.company.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { domain: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, domain: true },
          take: 5,
        }),
        ctx.prisma.deal.findMany({
          where: {
            deletedAt: null,
            title: { contains: q, mode: "insensitive" },
          },
          select: {
            id: true,
            title: true,
            value: true,
            stage: { select: { name: true } },
          },
          take: 5,
        }),
      ])

      return { contacts, companies, deals }
    }),
})

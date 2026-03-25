import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth()

  return {
    prisma,
    userId: session.userId,
    orgId: session.orgId,
    headers: opts.headers,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory

export const publicProcedure = t.procedure

const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  const role = "admin" as "admin" | "manager" | "rep" | "viewer"

  return next({
    ctx: {
      userId: ctx.userId,
      orgId: ctx.orgId ?? "default",
      role,
    },
  })
})

export const protectedProcedure = t.procedure.use(enforceAuth)

const enforceAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }

  return next({
    ctx: {
      userId: ctx.userId,
      orgId: ctx.orgId ?? "default",
      role: "admin" as const,
    },
  })
})

export const adminProcedure = t.procedure.use(enforceAdmin)

import { createTRPCRouter, createCallerFactory } from "./trpc"
import { contactsRouter } from "./routers/contacts"
import { companiesRouter } from "./routers/companies"
import { dealsRouter } from "./routers/deals"
import { activitiesRouter } from "./routers/activities"
import { pipelinesRouter } from "./routers/pipelines"
import { automationsRouter } from "./routers/automations"
import { routingRouter } from "./routers/routing"
import { sequencesRouter } from "./routers/sequences"
import { customFieldsRouter } from "./routers/customFields"
import { enrichmentRouter } from "./routers/enrichment"
import { webhooksRouter } from "./routers/webhooks"
import { auditLogRouter } from "./routers/auditLog"
import { reportsRouter } from "./routers/reports"
import { searchRouter } from "./routers/search"

export const appRouter = createTRPCRouter({
  contacts: contactsRouter,
  companies: companiesRouter,
  deals: dealsRouter,
  activities: activitiesRouter,
  pipelines: pipelinesRouter,
  automations: automationsRouter,
  routing: routingRouter,
  sequences: sequencesRouter,
  customFields: customFieldsRouter,
  enrichment: enrichmentRouter,
  webhooks: webhooksRouter,
  auditLog: auditLogRouter,
  reports: reportsRouter,
  search: searchRouter,
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)

import { serve } from "inngest/next"
import { inngest } from "@/server/inngest/client"
import { enrichmentCron } from "@/server/inngest/functions/enrichment-cron"
import { sequenceRunner } from "@/server/inngest/functions/sequence-runner"
import { webhookDispatcher } from "@/server/inngest/functions/webhook-dispatcher"
import { routingEngine } from "@/server/inngest/functions/routing-engine"
import { staleDealChecker } from "@/server/inngest/functions/stale-deal-checker"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    enrichmentCron,
    sequenceRunner,
    webhookDispatcher,
    routingEngine,
    staleDealChecker,
  ],
})

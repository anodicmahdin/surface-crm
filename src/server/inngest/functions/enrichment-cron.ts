import { inngest } from "../client"
import { prisma } from "@/lib/prisma"
import { enrichContact } from "@/server/services/enrichment"
import { logAudit } from "@/server/services/audit"
import { sendSlackNotification } from "@/server/services/slack"

export const enrichmentCron = inngest.createFunction(
  { id: "enrichment-cron", name: "Daily Enrichment Cron" },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const contacts = await step.run("fetch-stale-contacts", async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return prisma.contact.findMany({
        where: {
          deletedAt: null,
          email: { not: null },
          enrichmentStatus: { not: "FAILED" },
          OR: [
            { lastEnrichedAt: null },
            { lastEnrichedAt: { lt: thirtyDaysAgo } },
          ],
        },
        select: { id: true, email: true },
        take: 50,
      })
    })

    let successCount = 0
    let failureCount = 0

    for (const contact of contacts) {
      await step.run(`enrich-${contact.id}`, async () => {
        try {
          const result = await enrichContact(contact.email!)
          if (result) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: {
                enrichmentData: result.data,
                enrichmentSource: result.source,
                enrichmentStatus: "ENRICHED",
                lastEnrichedAt: new Date(),
              },
            })
            successCount++
          } else {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { enrichmentStatus: "FAILED", lastEnrichedAt: new Date() },
            })
            failureCount++
          }
        } catch {
          failureCount++
          await prisma.contact.update({
            where: { id: contact.id },
            data: { enrichmentStatus: "FAILED", lastEnrichedAt: new Date() },
          })
        }
      })
    }

    if (contacts.length > 0 && failureCount / contacts.length > 0.5) {
      await step.run("alert-high-failure-rate", async () => {
        await sendSlackNotification({
          text: `Enrichment alert: ${failureCount}/${contacts.length} contacts failed enrichment (${Math.round(failureCount / contacts.length * 100)}% failure rate)`,
        })
      })
    }

    await step.run("log-completion", async () => {
      await logAudit({
        entityType: "system",
        entityId: "enrichment-cron",
        action: "enrichment_batch_completed",
        isSystemAction: true,
        metadata: { processed: contacts.length, success: successCount, failed: failureCount },
      })
    })

    return { processed: contacts.length, success: successCount, failed: failureCount }
  }
)

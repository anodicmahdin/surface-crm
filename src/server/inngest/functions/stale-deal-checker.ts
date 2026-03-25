import { inngest } from "../client"
import { prisma } from "@/lib/prisma"
import { sendSlackNotification } from "@/server/services/slack"

export const staleDealChecker = inngest.createFunction(
  { id: "stale-deal-checker", name: "Stale Deal Checker" },
  { cron: "0 9 * * 1" },
  async ({ step }) => {
    const staleDeals = await step.run("find-stale-deals", async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      return prisma.deal.findMany({
        where: {
          deletedAt: null,
          closedWon: null,
          updatedAt: { lt: fourteenDaysAgo },
        },
        include: {
          stage: true,
          contact: { select: { firstName: true, lastName: true } },
          company: { select: { name: true } },
        },
      })
    })

    if (staleDeals.length > 0) {
      await step.run("send-alert", async () => {
        const dealList = staleDeals
          .slice(0, 10)
          .map((d) => `• ${d.title} (${d.stage.name}) - ${d.company?.name ?? "No company"}`)
          .join("\n")

        await sendSlackNotification({
          text: `${staleDeals.length} stale deals detected (no activity in 14+ days):\n${dealList}`,
        })
      })
    }

    return { staleDeals: staleDeals.length }
  }
)

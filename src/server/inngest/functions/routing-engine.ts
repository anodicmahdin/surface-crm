import { inngest } from "../client"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/server/services/audit"
import { sendSlackNotification, buildLeadAssignedMessage } from "@/server/services/slack"

export const routingEngine = inngest.createFunction(
  { id: "routing-engine", name: "Lead Routing Engine" },
  { event: "crm/contact.route" },
  async ({ event, step }) => {
    const { contactId } = event.data as { contactId: string }

    const contact = await step.run("fetch-contact", async () => {
      return prisma.contact.findUnique({
        where: { id: contactId },
        include: { company: true },
      })
    })

    if (!contact || contact.ownerId) return { skipped: true, reason: "Already assigned or not found" }

    const rules = await step.run("fetch-rules", async () => {
      return prisma.routingRule.findMany({
        where: { isActive: true },
        orderBy: { priority: "desc" },
      })
    })

    for (const rule of rules) {
      const matched = await step.run(`evaluate-rule-${rule.id}`, async () => {
        const conditions = rule.conditions as Record<string, { operator: string; value: string }>
        for (const [field, condition] of Object.entries(conditions)) {
          const contactValue = (contact as Record<string, unknown>)[field] ??
            (contact.company as Record<string, unknown> | null)?.[field]
          
          if (!contactValue) return false

          const strValue = String(contactValue)
          switch (condition.operator) {
            case "equals": if (strValue !== condition.value) return false; break
            case "contains": if (!strValue.toLowerCase().includes(condition.value.toLowerCase())) return false; break
            case "greater_than": if (Number(strValue) <= Number(condition.value)) return false; break
            default: return false
          }
        }
        return true
      })

      if (matched) {
        const assignedUserId = await step.run(`assign-${rule.id}`, async () => {
          const config = rule.assignmentConfig as Record<string, unknown>

          if (rule.assignmentType === "ROUND_ROBIN") {
            const members = (config.members as string[]) ?? []
            if (!members.length) return rule.fallbackOwnerId

            const state = await prisma.routingRoundRobinState.upsert({
              where: { routingRuleId: rule.id },
              create: { routingRuleId: rule.id, lastAssignedIndex: 0 },
              update: {},
            })

            const nextIndex = (state.lastAssignedIndex + 1) % members.length

            await prisma.routingRoundRobinState.update({
              where: { routingRuleId: rule.id },
              data: { lastAssignedIndex: nextIndex, lastAssignedAt: new Date() },
            })

            return members[nextIndex]
          }

          if (rule.assignmentType === "SPECIFIC_USER") {
            return config.userId as string
          }

          if (rule.assignmentType === "TERRITORY") {
            const territories = (config.territories as { name: string; owner: string }[]) ?? []
            return territories[0]?.owner ?? rule.fallbackOwnerId
          }

          return rule.fallbackOwnerId
        })

        if (assignedUserId) {
          await step.run("update-contact", async () => {
            await prisma.contact.update({
              where: { id: contactId },
              data: { ownerId: assignedUserId },
            })
          })

          await step.run("log-routing", async () => {
            await prisma.activity.create({
              data: {
                type: "SYSTEM",
                subject: `Routed to ${assignedUserId} via rule '${rule.name}'`,
                contactId,
                userId: "system",
                isAutomated: true,
                metadata: { routingRuleId: rule.id },
              },
            })

            await logAudit({
              entityType: "contact",
              entityId: contactId,
              action: "routing_assigned",
              isSystemAction: true,
              newValue: { ownerId: assignedUserId },
              metadata: {
                routingRuleId: rule.id,
                routingRuleName: rule.name,
                assignmentType: rule.assignmentType,
              },
            })

            await prisma.routingRule.update({
              where: { id: rule.id },
              data: { executionCount: { increment: 1 }, lastExecutedAt: new Date() },
            })

            await sendSlackNotification(
              buildLeadAssignedMessage(
                `${contact.firstName} ${contact.lastName}`,
                contact.company?.name,
                assignedUserId,
                rule.name
              )
            )
          })

          return { assigned: true, userId: assignedUserId, rule: rule.name }
        }
      }
    }

    return { assigned: false, reason: "No matching rule" }
  }
)

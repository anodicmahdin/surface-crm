import { inngest } from "../client"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/server/services/email"
import { logAudit } from "@/server/services/audit"

function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}

export const sequenceRunner = inngest.createFunction(
  { id: "sequence-runner", name: "Sequence Step Runner" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const enrollments = await step.run("fetch-due-enrollments", async () => {
      return prisma.sequenceEnrollment.findMany({
        where: {
          status: "ACTIVE",
          nextStepAt: { lte: new Date() },
        },
        include: {
          contact: true,
          sequence: {
            include: { steps: { orderBy: { order: "asc" } } },
          },
        },
        take: 100,
      })
    })

    for (const enrollment of enrollments) {
      await step.run(`process-enrollment-${enrollment.id}`, async () => {
        const steps = enrollment.sequence.steps
        const currentStep = steps[enrollment.currentStep]
        if (!currentStep) {
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          })
          return
        }

        const contact = enrollment.contact

        if (currentStep.type === "EMAIL" && contact.email) {
          const templateData: Record<string, string> = {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            company: "",
            title: contact.title ?? "",
          }

          try {
            await sendEmail({
              to: contact.email,
              subject: renderTemplate(currentStep.subject ?? "", templateData),
              html: renderTemplate(currentStep.body ?? "", templateData),
            })

            await prisma.activity.create({
              data: {
                type: "EMAIL",
                subject: currentStep.subject ?? "Sequence email",
                body: currentStep.body,
                direction: "outbound",
                contactId: contact.id,
                userId: enrollment.enrolledBy,
                isAutomated: true,
                metadata: { sequenceId: enrollment.sequenceId, stepOrder: currentStep.order },
              },
            })
          } catch (error) {
            await prisma.sequenceEnrollment.update({
              where: { id: enrollment.id },
              data: { status: "PAUSED", pausedAt: new Date(), pauseReason: "Email send failed" },
            })
            return
          }
        }

        if (currentStep.type === "TASK") {
          await prisma.activity.create({
            data: {
              type: "TASK",
              subject: currentStep.subject ?? "Sequence task",
              body: currentStep.body,
              contactId: contact.id,
              userId: enrollment.enrolledBy,
              isAutomated: true,
            },
          })
        }

        const nextStepIndex = enrollment.currentStep + 1
        const nextStep = steps[nextStepIndex]

        if (!nextStep) {
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "COMPLETED", completedAt: new Date(), currentStep: nextStepIndex },
          })
        } else {
          let nextStepAt = new Date()
          if (nextStep.type === "WAIT") {
            const waitMs = ((nextStep.waitDays ?? 0) * 86400 + (nextStep.waitHours ?? 0) * 3600) * 1000
            nextStepAt = new Date(Date.now() + waitMs)
          }

          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { currentStep: nextStepIndex, nextStepAt },
          })
        }

        await logAudit({
          entityType: "sequence",
          entityId: enrollment.sequenceId,
          action: "step_executed",
          isSystemAction: true,
          metadata: { enrollmentId: enrollment.id, stepOrder: currentStep.order, stepType: currentStep.type },
        })
      })
    }

    return { processed: enrollments.length }
  }
)

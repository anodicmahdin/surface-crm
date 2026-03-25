import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Resetting database...")

  // Delete in dependency order
  await prisma.webhookDelivery.deleteMany()
  await prisma.webhookEndpoint.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.sequenceEnrollment.deleteMany()
  await prisma.sequenceStep.deleteMany()
  await prisma.sequence.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.contactTag.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.company.deleteMany()
  await prisma.pipelineStage.deleteMany()
  await prisma.pipeline.deleteMany()
  await prisma.routingRoundRobinState.deleteMany()
  await prisma.routingRule.deleteMany()
  await prisma.automationRule.deleteMany()
  await prisma.customFieldDefinition.deleteMany()

  console.log("Database reset complete. Ready for real data.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

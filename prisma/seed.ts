import { PrismaClient, ContactStatus, ActivityType, TriggerType, ActionType, AssignmentType, SequenceStatus, SequenceStepType, EntityType, FieldType } from "@prisma/client"

const prisma = new PrismaClient()

const firstNames = ["James", "Sarah", "Michael", "Emily", "David", "Lisa", "Robert", "Jennifer", "William", "Jessica", "Daniel", "Amanda", "Christopher", "Stephanie", "Matthew", "Nicole", "Andrew", "Rachel", "Joshua", "Lauren", "Ryan", "Megan", "Brandon", "Ashley", "Tyler", "Samantha", "Nathan", "Kayla", "Justin", "Brittany", "Kevin", "Heather", "Jason", "Amber", "Aaron", "Tiffany", "Mark", "Christina", "Brian", "Rebecca", "Eric", "Katherine", "Steven", "Elizabeth", "Patrick", "Danielle", "Thomas", "Michelle", "Gregory", "Courtney"]
const lastNames = ["Anderson", "Chen", "Williams", "Patel", "Johnson", "Kim", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera", "Cooper"]
const titles = ["CEO", "CTO", "VP of Sales", "VP of Marketing", "Director of Engineering", "Head of Product", "Sales Manager", "Account Executive", "SDR", "BDR", "Marketing Manager", "Head of Growth", "COO", "CFO", "Director of Operations", "Product Manager", "Engineering Manager", "Head of Partnerships", "Revenue Operations Lead", "Customer Success Manager"]
const companyNames = ["Acme Corp", "TechFlow Inc", "DataStream Systems", "CloudNine Software", "Velocity Labs", "Apex Solutions", "Quantum Analytics", "NovaTech", "Synergy Digital", "BlueShift AI", "Pinnacle Group", "Horizon Technologies", "Catalyst Ventures", "Forge Innovations", "Eclipse Software", "Summit Networks", "Prism Analytics", "Atlas Computing", "Zenith Labs", "Meridian Solutions"]
const domains = ["acme.com", "techflow.io", "datastream.com", "cloudnine.dev", "velocitylabs.co", "apexsolutions.com", "quantumanalytics.ai", "novatech.io", "synergydigital.com", "blueshift.ai", "pinnaclegroup.com", "horizontech.dev", "catalystvc.com", "forgeinnovations.io", "eclipsesw.com", "summitnetworks.com", "prismanalytics.co", "atlascomputing.io", "zenithlabs.dev", "meridiansolutions.com"]
const industries = ["SaaS", "FinTech", "HealthTech", "EdTech", "E-Commerce", "AI/ML", "Cybersecurity", "MarTech", "HR Tech", "Real Estate"]
const sources = ["inbound_form", "apollo", "linkedin", "referral", "cold_outbound", "website", "event"]
const statuses: ContactStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "NURTURING", "CUSTOMER"]
const headcounts = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000"]
const fundingStages = ["pre-seed", "seed", "series_a", "series_b", "series_c", "growth"]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log("Seeding database...")

  const pipeline = await prisma.pipeline.create({
    data: {
      name: "Sales Pipeline",
      isDefault: true,
      stages: {
        create: [
          { name: "Prospecting", color: "#6366f1", order: 0, probability: 10 },
          { name: "Discovery", color: "#8b5cf6", order: 1, probability: 25 },
          { name: "Proposal", color: "#a855f7", order: 2, probability: 50 },
          { name: "Negotiation", color: "#d946ef", order: 3, probability: 75 },
          { name: "Closed Won", color: "#22c55e", order: 4, probability: 100, isClosedWon: true },
          { name: "Closed Lost", color: "#ef4444", order: 5, probability: 0, isClosedLost: true },
        ],
      },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  })

  console.log(`Created pipeline with ${pipeline.stages.length} stages`)

  const companies = []
  for (let i = 0; i < 20; i++) {
    const company = await prisma.company.create({
      data: {
        name: companyNames[i],
        domain: domains[i],
        industry: pick(industries),
        headcount: pick(headcounts),
        fundingStage: pick(fundingStages),
        location: pick(["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Chicago, IL", "Boston, MA", "Denver, CO", "Los Angeles, CA", "Miami, FL", "Portland, OR"]),
        description: `${companyNames[i]} is a leading company in the ${pick(industries)} space.`,
        websiteUrl: `https://${domains[i]}`,
      },
    })
    companies.push(company)
  }
  console.log(`Created ${companies.length} companies`)

  const tags = await Promise.all(
    ["hot-lead", "decision-maker", "champion", "influencer", "enterprise", "startup", "referral", "high-priority"].map(
      (name) => prisma.tag.create({ data: { name, color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}` } })
    )
  )
  console.log(`Created ${tags.length} tags`)

  const contacts = []
  for (let i = 0; i < 100; i++) {
    const fn = pick(firstNames)
    const ln = pick(lastNames)
    const company = pick(companies)
    const contact = await prisma.contact.create({
      data: {
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${company.domain ?? "example.com"}`,
        phone: `+1${rand(200, 999)}${rand(100, 999)}${rand(1000, 9999)}`,
        title: pick(titles),
        linkedinUrl: `https://linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}`,
        source: pick(sources),
        status: pick(statuses),
        companyId: company.id,
        leadScore: rand(0, 100),
        customFields: {},
        enrichmentData: {},
        enrichmentStatus: pick(["PENDING", "ENRICHED", "ENRICHED", "ENRICHED"]) as "PENDING" | "ENRICHED",
        lastEnrichedAt: Math.random() > 0.5 ? new Date(Date.now() - rand(1, 30) * 86400000) : null,
      },
    })
    contacts.push(contact)

    if (Math.random() > 0.6) {
      const tag = pick(tags)
      await prisma.contactTag.create({
        data: { contactId: contact.id, tagId: tag.id },
      }).catch(() => {})
    }
  }
  console.log(`Created ${contacts.length} contacts`)

  const openStages = pipeline.stages.filter((s) => !s.isClosedWon && !s.isClosedLost)
  const deals = []
  for (let i = 0; i < 30; i++) {
    const stage = pick(openStages)
    const contact = pick(contacts)
    const deal = await prisma.deal.create({
      data: {
        title: `${pick(["Enterprise", "Growth", "Starter", "Pro", "Team", "Business"])} Plan - ${pick(companyNames)}`,
        value: pick([5000, 10000, 15000, 25000, 50000, 75000, 100000, 150000, 250000, 500000]),
        stageId: stage.id,
        pipelineId: pipeline.id,
        probability: stage.probability ?? 50,
        expectedCloseDate: new Date(Date.now() + rand(7, 90) * 86400000),
        contactId: contact.id,
        companyId: contact.companyId,
        position: i,
        customFields: {},
      },
    })
    deals.push(deal)
  }
  console.log(`Created ${deals.length} deals`)

  const activityTypes: ActivityType[] = ["CALL", "EMAIL", "NOTE", "MEETING", "TASK"]
  for (let i = 0; i < 200; i++) {
    const type = pick(activityTypes)
    const contact = pick(contacts)
    const deal = Math.random() > 0.5 ? pick(deals) : null

    await prisma.activity.create({
      data: {
        type,
        subject: type === "CALL" ? "Sales call" :
                 type === "EMAIL" ? `Re: ${pick(["Meeting follow-up", "Product demo", "Pricing discussion", "Introduction"])}` :
                 type === "NOTE" ? "Internal note" :
                 type === "MEETING" ? `Meeting with ${contact.firstName}` :
                 `Follow up with ${contact.firstName}`,
        body: type === "NOTE" ? pick(["Great conversation, they are interested in enterprise plan.", "Need to follow up next week.", "Decision maker is the VP of Engineering.", "Budget approved, moving forward.", "They are evaluating competitors."]) :
              type === "EMAIL" ? "Thanks for your time today. I wanted to follow up on our conversation..." : null,
        direction: type === "CALL" || type === "EMAIL" ? pick(["inbound", "outbound"]) : null,
        duration: type === "CALL" ? rand(60, 1800) : null,
        outcome: type === "CALL" ? pick(["connected", "voicemail", "no_answer"]) : null,
        contactId: contact.id,
        dealId: deal?.id,
        userId: "system",
        metadata: {},
        createdAt: new Date(Date.now() - rand(0, 30) * 86400000 - rand(0, 86400) * 1000),
      },
    })
  }
  console.log("Created 200 activities")

  await prisma.customFieldDefinition.createMany({
    data: [
      { entityType: "CONTACT" as EntityType, fieldName: "linkedin-connections", label: "LinkedIn Connections", fieldType: "NUMBER" as FieldType, order: 0, groupName: "Social", createdBy: "system" },
      { entityType: "CONTACT" as EntityType, fieldName: "preferred-contact-method", label: "Preferred Contact Method", fieldType: "SELECT" as FieldType, options: ["Email", "Phone", "LinkedIn", "Text"], order: 1, groupName: "Preferences", createdBy: "system" },
      { entityType: "COMPANY" as EntityType, fieldName: "tech-stack", label: "Tech Stack", fieldType: "MULTI_SELECT" as FieldType, options: ["React", "Node.js", "Python", "Java", "Go", "AWS", "GCP", "Azure"], order: 0, groupName: "Technical", createdBy: "system" },
      { entityType: "COMPANY" as EntityType, fieldName: "nps-score", label: "NPS Score", fieldType: "NUMBER" as FieldType, order: 1, groupName: "Metrics", createdBy: "system" },
      { entityType: "DEAL" as EntityType, fieldName: "competitor", label: "Competitor", fieldType: "SELECT" as FieldType, options: ["HubSpot", "Salesforce", "Pipedrive", "Close", "None"], order: 0, groupName: "Competition", createdBy: "system" },
    ],
  })
  console.log("Created 5 custom field definitions")

  await prisma.automationRule.createMany({
    data: [
      {
        name: "Notify Slack on High-Value Deal",
        triggerType: "DEAL_CREATED" as TriggerType,
        triggerConfig: {},
        conditions: [{ field: "value", operator: "greater_than", value: 50000 }],
        actionType: "SEND_SLACK" as ActionType,
        actionConfig: { message: "New high-value deal: {{deal.title}} worth {{deal.value}}" },
        isActive: true,
        createdBy: "system",
      },
      {
        name: "Auto-enrich New Contacts",
        triggerType: "CONTACT_CREATED" as TriggerType,
        triggerConfig: {},
        conditions: [],
        actionType: "CREATE_ACTIVITY" as ActionType,
        actionConfig: { type: "SYSTEM", subject: "Contact auto-enrichment queued" },
        isActive: true,
        createdBy: "system",
      },
      {
        name: "Alert on Deal Stage Change",
        triggerType: "DEAL_STAGE_CHANGED" as TriggerType,
        triggerConfig: {},
        conditions: [],
        actionType: "SEND_SLACK" as ActionType,
        actionConfig: { message: "Deal {{deal.title}} moved to {{deal.stage}}" },
        isActive: true,
        createdBy: "system",
      },
    ],
  })
  console.log("Created 3 automation rules")

  await prisma.routingRule.createMany({
    data: [
      {
        name: "Enterprise Round Robin",
        priority: 10,
        conditions: { headcount: { operator: "greater_than", value: "200" } },
        assignmentType: "ROUND_ROBIN" as AssignmentType,
        assignmentConfig: { members: ["user_1", "user_2", "user_3"] },
        isActive: true,
        createdBy: "system",
      },
      {
        name: "SMB Territory - West Coast",
        priority: 5,
        conditions: { location: { operator: "contains", value: "CA" } },
        assignmentType: "TERRITORY" as AssignmentType,
        assignmentConfig: { territories: [{ name: "West Coast", owner: "user_4" }] },
        isActive: true,
        createdBy: "system",
      },
    ],
  })
  console.log("Created 2 routing rules")

  const sequence = await prisma.sequence.create({
    data: {
      name: "Cold Outbound - SaaS Decision Makers",
      description: "4-step sequence for cold outbound to SaaS decision makers",
      status: "ACTIVE" as SequenceStatus,
      ownerId: "system",
      steps: {
        create: [
          { order: 0, type: "EMAIL" as SequenceStepType, subject: "Quick question about {{company}}", body: "Hi {{firstName}},\n\nI noticed {{company}} is growing fast in the {{industry}} space. We help companies like yours..." },
          { order: 1, type: "WAIT" as SequenceStepType, waitDays: 3 },
          { order: 2, type: "EMAIL" as SequenceStepType, subject: "Re: Quick question about {{company}}", body: "Hi {{firstName}},\n\nJust wanted to follow up on my previous email..." },
          { order: 3, type: "WAIT" as SequenceStepType, waitDays: 2 },
        ],
      },
    },
  })
  console.log(`Created sequence: ${sequence.name}`)

  console.log("\nSeed completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

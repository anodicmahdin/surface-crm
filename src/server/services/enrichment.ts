type EnrichmentResult = {
  source: "apollo" | "clay" | "manual"
  data: {
    title?: string
    company?: string
    companyDomain?: string
    phone?: string
    linkedinUrl?: string
    location?: string
    industry?: string
    headcount?: string
    fundingStage?: string
    annualRevenue?: string
  }
}

async function enrichViaApollo(email: string): Promise<EnrichmentResult | null> {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.person) return null

    return {
      source: "apollo",
      data: {
        title: data.person.title,
        company: data.person.organization?.name,
        companyDomain: data.person.organization?.primary_domain,
        phone: data.person.phone_numbers?.[0]?.sanitized_number,
        linkedinUrl: data.person.linkedin_url,
        location: [data.person.city, data.person.state, data.person.country]
          .filter(Boolean)
          .join(", "),
        industry: data.person.organization?.industry,
        headcount: data.person.organization?.estimated_num_employees?.toString(),
        fundingStage: data.person.organization?.funding_stage,
        annualRevenue: data.person.organization?.annual_revenue_printed,
      },
    }
  } catch {
    return null
  }
}

async function enrichViaClay(email: string): Promise<EnrichmentResult | null> {
  const apiKey = process.env.CLAY_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch("https://api.clay.com/v1/enrich", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) return null

    const data = await response.json()

    return {
      source: "clay",
      data: {
        title: data.title,
        company: data.company_name,
        companyDomain: data.company_domain,
        phone: data.phone,
        linkedinUrl: data.linkedin_url,
        location: data.location,
        industry: data.industry,
        headcount: data.headcount,
      },
    }
  } catch {
    return null
  }
}

export async function enrichContact(email: string): Promise<EnrichmentResult | null> {
  const apolloResult = await enrichViaApollo(email)
  if (apolloResult) return apolloResult

  const clayResult = await enrichViaClay(email)
  if (clayResult) return clayResult

  return null
}

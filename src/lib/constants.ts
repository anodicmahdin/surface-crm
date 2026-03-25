export const SIDEBAR_WIDTH = 240
export const SIDEBAR_COLLAPSED_WIDTH = 60

export const PER_PAGE_OPTIONS = [25, 50, 100] as const
export const DEFAULT_PER_PAGE = 25

export const CONTACT_SOURCES = [
  "inbound_form",
  "apollo",
  "linkedin",
  "referral",
  "cold_outbound",
  "website",
  "event",
  "partner",
  "other",
] as const

export const HEADCOUNT_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10000+",
] as const

export const FUNDING_STAGES = [
  "pre-seed",
  "seed",
  "series_a",
  "series_b",
  "series_c",
  "series_d",
  "growth",
  "public",
  "bootstrapped",
] as const

export const CALL_OUTCOMES = [
  "connected",
  "voicemail",
  "no_answer",
  "busy",
] as const

export const INDUSTRIES = [
  "SaaS",
  "FinTech",
  "HealthTech",
  "EdTech",
  "E-Commerce",
  "AI/ML",
  "Cybersecurity",
  "MarTech",
  "HR Tech",
  "Real Estate",
  "Logistics",
  "Media",
  "Gaming",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Other",
] as const

export const WEBHOOK_EVENTS = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "deal.created",
  "deal.updated",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "activity.created",
  "sequence.enrolled",
  "sequence.completed",
] as const

import type {
  Contact,
  Company,
  Deal,
  Pipeline,
  PipelineStage,
  Activity,
  Sequence,
  SequenceStep,
  SequenceEnrollment,
  AutomationRule,
  RoutingRule,
  CustomFieldDefinition,
  AuditLog,
  WebhookEndpoint,
  WebhookDelivery,
  Tag,
} from '@prisma/client'

export type {
  Contact,
  Company,
  Deal,
  Pipeline,
  PipelineStage,
  Activity,
  Sequence,
  SequenceStep,
  SequenceEnrollment,
  AutomationRule,
  RoutingRule,
  CustomFieldDefinition,
  AuditLog,
  WebhookEndpoint,
  WebhookDelivery,
  Tag,
}

export type ContactWithRelations = Contact & {
  company?: Company | null
  deals?: Deal[]
  activities?: Activity[]
  tags?: { tag: Tag }[]
}

export type CompanyWithRelations = Company & {
  contacts?: Contact[]
  deals?: Deal[]
  _count?: {
    contacts: number
    deals: number
  }
}

export type DealWithRelations = Deal & {
  stage: PipelineStage
  pipeline: Pipeline
  contact?: Contact | null
  company?: Company | null
  activities?: Activity[]
}

export type PipelineWithStages = Pipeline & {
  stages: (PipelineStage & {
    deals: DealWithRelations[]
    _count?: { deals: number }
  })[]
}

export type PaginatedResponse<T> = {
  items: T[]
  totalCount: number
  page: number
  perPage: number
  totalPages: number
}

export type UserInfo = {
  userId: string
  orgId: string
  role: 'admin' | 'manager' | 'rep' | 'viewer'
}

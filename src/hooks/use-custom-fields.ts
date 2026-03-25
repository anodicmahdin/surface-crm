"use client"

import { trpc } from "@/lib/trpc"
import { EntityType } from "@prisma/client"

export function useCustomFields(entityType: EntityType) {
  const { data: fields, isLoading } = trpc.customFields.list.useQuery({ entityType })

  return {
    fields: fields ?? [],
    isLoading,
  }
}

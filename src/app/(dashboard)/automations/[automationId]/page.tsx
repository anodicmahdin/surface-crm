"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { Zap, Filter, Play, Save, Trash2, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

const TRIGGER_TYPES = [
  "CONTACT_CREATED",
  "DEAL_CREATED",
  "DEAL_STAGE_CHANGED",
  "FIELD_CHANGED",
  "FORM_SUBMITTED",
  "SCHEDULED",
  "MANUAL",
] as const

const ACTION_TYPES = [
  "ASSIGN_OWNER",
  "SEND_SLACK",
  "ENROLL_SEQUENCE",
  "UPDATE_FIELD",
  "SEND_EMAIL",
  "CREATE_TASK",
  "SEND_WEBHOOK",
  "CREATE_ACTIVITY",
] as const

type Condition = { field: string; operator: string; value: string }

export default function AutomationBuilderPage() {
  const params = useParams<{ automationId: string }>()
  const router = useRouter()
  const isNew = params.automationId === "new"

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [triggerType, setTriggerType] = useState<string>("CONTACT_CREATED")
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({})
  const [conditions, setConditions] = useState<Condition[]>([])
  const [actionType, setActionType] = useState<string>("ASSIGN_OWNER")
  const [actionConfig, setActionConfig] = useState<Record<string, string>>({})

  const utils = trpc.useUtils()

  const { data: existing, isLoading } = trpc.automations.getById.useQuery(
    { id: params.automationId },
    { enabled: !isNew }
  )

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setDescription(existing.description ?? "")
      setTriggerType(existing.triggerType)
      setTriggerConfig((existing.triggerConfig as Record<string, unknown>) ?? {})
      const parsed = Array.isArray(existing.conditions)
        ? (existing.conditions as Condition[])
        : []
      setConditions(parsed)
      setActionType(existing.actionType)
      setActionConfig((existing.actionConfig as Record<string, string>) ?? {})
    }
  }, [existing])

  const createMutation = trpc.automations.create.useMutation({
    onSuccess: (rule) => {
      toast.success("Automation created")
      router.push(`/automations/${rule.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = trpc.automations.update.useMutation({
    onSuccess: () => {
      toast.success("Automation updated")
      utils.automations.getById.invalidate({ id: params.automationId })
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSave = () => {
    if (!name.trim()) return toast.error("Name is required")

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      triggerType: triggerType as (typeof TRIGGER_TYPES)[number],
      triggerConfig,
      conditions: conditions.length > 0 ? conditions : undefined,
      actionType: actionType as (typeof ACTION_TYPES)[number],
      actionConfig,
    }

    if (isNew) {
      createMutation.mutate(payload)
    } else {
      updateMutation.mutate({ id: params.automationId, ...payload })
    }
  }

  const addCondition = () => {
    setConditions([...conditions, { field: "", operator: "equals", value: "" }])
  }

  const updateCondition = (index: number, key: keyof Condition, value: string) => {
    const updated = [...conditions]
    updated[index] = { ...updated[index], [key]: value }
    setConditions(updated)
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  if (!isNew && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? "New Automation" : "Edit Automation"}
          </h1>
          <p className="text-muted-foreground">
            Configure trigger, conditions, and actions
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Automation name..."
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
          />
        </div>
      </div>

      <div className="grid gap-6">
        {/* WHEN - Trigger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Zap className="h-4 w-4" />
              </div>
              WHEN (Trigger)
            </CardTitle>
            <CardDescription>Define what triggers this automation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IF - Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                <Filter className="h-4 w-4" />
              </div>
              IF (Conditions)
            </CardTitle>
            <CardDescription>Optional conditions to filter triggers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Field (e.g. status)"
                    value={cond.field}
                    onChange={(e) => updateCondition(i, "field", e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => updateCondition(i, "operator", v)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">equals</SelectItem>
                      <SelectItem value="not_equals">not equals</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                      <SelectItem value="greater_than">greater than</SelectItem>
                      <SelectItem value="less_than">less than</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    value={cond.value}
                    onChange={(e) => updateCondition(i, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(i)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="mr-2 h-4 w-4" />
                Add Condition
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* THEN - Action */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                <Play className="h-4 w-4" />
              </div>
              THEN (Action)
            </CardTitle>
            <CardDescription>What happens when conditions are met</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Configuration (key-value)</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Config key"
                    value={actionConfig.key ?? ""}
                    onChange={(e) =>
                      setActionConfig({ ...actionConfig, key: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Config value"
                    value={actionConfig.value ?? ""}
                    onChange={(e) =>
                      setActionConfig({ ...actionConfig, value: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

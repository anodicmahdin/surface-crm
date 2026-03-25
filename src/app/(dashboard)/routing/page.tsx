"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { Plus, GripVertical, ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toast } from "sonner"

const ASSIGNMENT_TYPES = [
  "ROUND_ROBIN",
  "WEIGHTED",
  "TERRITORY",
  "SPECIFIC_USER",
] as const

const assignmentLabels: Record<string, string> = {
  ROUND_ROBIN: "Round Robin",
  WEIGHTED: "Weighted",
  TERRITORY: "Territory",
  SPECIFIC_USER: "Specific User",
}

export default function RoutingPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("0")
  const [assignmentType, setAssignmentType] = useState<string>("ROUND_ROBIN")

  const utils = trpc.useUtils()
  const { data: rules, isLoading } = trpc.routing.list.useQuery()

  const createMutation = trpc.routing.create.useMutation({
    onSuccess: () => {
      toast.success("Routing rule created")
      utils.routing.list.invalidate()
      setSheetOpen(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = trpc.routing.update.useMutation({
    onSuccess: () => {
      utils.routing.list.invalidate()
      toast.success("Rule updated")
    },
    onError: (err) => toast.error(err.message),
  })

  const resetForm = () => {
    setName("")
    setDescription("")
    setPriority("0")
    setAssignmentType("ROUND_ROBIN")
  }

  const handleCreate = () => {
    if (!name.trim()) return toast.error("Name is required")
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      priority: parseInt(priority) || 0,
      conditions: {},
      assignmentType: assignmentType as (typeof ASSIGNMENT_TYPES)[number],
      assignmentConfig: {},
    })
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateMutation.mutate({ id, isActive })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Routing</h1>
          <p className="text-muted-foreground">
            Configure rules for automatic lead assignment
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Rule
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>New Routing Rule</SheetTitle>
              <SheetDescription>
                Create a new rule for automatic lead assignment.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise Leads"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rule description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Assignment Type</Label>
                <Select value={assignmentType} onValueChange={setAssignmentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {assignmentLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rules?.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            No routing rules yet. Create your first one!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules?.map((rule) => {
            const conditionsSummary = rule.conditions
              ? Object.keys(rule.conditions as Record<string, unknown>).length + " condition(s)"
              : "No conditions"

            return (
              <Card key={rule.id} className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant="outline" className="text-xs">
                        Priority {rule.priority}
                      </Badge>
                      <Badge variant="secondary">
                        {assignmentLabels[rule.assignmentType] ?? rule.assignmentType}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {conditionsSummary} &middot; {rule.executionCount} executions
                    </p>
                  </div>
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={(checked) =>
                      handleToggleActive(rule.id, checked)
                    }
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

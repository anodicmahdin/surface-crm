"use client"

import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { formatRelativeDate, cn } from "@/lib/utils"
import { Plus, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

const triggerLabels: Record<string, string> = {
  CONTACT_CREATED: "Contact Created",
  DEAL_CREATED: "Deal Created",
  DEAL_STAGE_CHANGED: "Stage Changed",
  FIELD_CHANGED: "Field Changed",
  FORM_SUBMITTED: "Form Submitted",
  SCHEDULED: "Scheduled",
  MANUAL: "Manual",
}

const actionLabels: Record<string, string> = {
  ASSIGN_OWNER: "Assign Owner",
  SEND_SLACK: "Send Slack",
  ENROLL_SEQUENCE: "Enroll Sequence",
  UPDATE_FIELD: "Update Field",
  SEND_EMAIL: "Send Email",
  CREATE_TASK: "Create Task",
  SEND_WEBHOOK: "Send Webhook",
  CREATE_ACTIVITY: "Create Activity",
}

export default function AutomationsPage() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.automations.list.useQuery({ page: 1, perPage: 50 })

  const toggleMutation = trpc.automations.toggleActive.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate()
      toast.success("Automation updated")
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground">
            Automate actions based on triggers and conditions
          </p>
        </div>
        <Button onClick={() => router.push("/automations/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Automation
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Executions</TableHead>
                <TableHead className="text-center">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No automations yet. Create your first one!
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((rule) => (
                  <TableRow
                    key={rule.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("[role='switch']")) return
                      router.push(`/automations/${rule.id}`)
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        {rule.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {triggerLabels[rule.triggerType] ?? rule.triggerType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {actionLabels[rule.actionType] ?? rule.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: rule.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {rule.executionCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(rule.errorCount > 0 && "font-medium text-destructive")}>
                        {rule.errorCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

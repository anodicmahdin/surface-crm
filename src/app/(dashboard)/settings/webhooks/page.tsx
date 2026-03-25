"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { formatRelativeDate, cn } from "@/lib/utils"
import { Plus, Webhook } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

const WEBHOOK_EVENTS = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "deal.created",
  "deal.updated",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "company.created",
  "company.updated",
  "activity.created",
]

export default function WebhooksPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  const utils = trpc.useUtils()
  const { data: endpoints, isLoading } = trpc.webhooks.listEndpoints.useQuery()

  const createMutation = trpc.webhooks.createEndpoint.useMutation({
    onSuccess: () => {
      toast.success("Webhook endpoint created")
      utils.webhooks.listEndpoints.invalidate()
      setDialogOpen(false)
      setUrl("")
      setSelectedEvents([])
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = trpc.webhooks.updateEndpoint.useMutation({
    onSuccess: () => {
      utils.webhooks.listEndpoints.invalidate()
      toast.success("Endpoint updated")
    },
    onError: (err) => toast.error(err.message),
  })

  const handleCreate = () => {
    if (!url.trim()) return toast.error("URL is required")
    if (selectedEvents.length === 0) return toast.error("Select at least one event")
    createMutation.mutate({ url: url.trim(), events: selectedEvents })
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Manage webhook endpoints for external integrations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Endpoint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Webhook Endpoint</DialogTitle>
              <DialogDescription>
                Add a URL to receive webhook events.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/webhooks"
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event} className="flex items-center gap-2">
                      <Checkbox
                        id={event}
                        checked={selectedEvents.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      <Label htmlFor={event} className="text-sm font-normal">
                        {event}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Endpoint"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead className="text-center">Events</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Failures</TableHead>
                <TableHead>Last Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!endpoints || endpoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    No webhook endpoints configured.
                  </TableCell>
                </TableRow>
              ) : (
                endpoints.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell className="max-w-[300px] truncate font-mono text-sm">
                      {ep.url}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{ep.events.length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={ep.isActive}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: ep.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          ep.failureCount > 0 && "font-medium text-destructive"
                        )}
                      >
                        {ep.failureCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ep.lastDeliveredAt
                        ? formatRelativeDate(ep.lastDeliveredAt)
                        : "Never"}
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

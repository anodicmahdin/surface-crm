"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { formatCurrency, formatRelativeDate, formatAbsoluteDate, cn, hashStringToColor, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DetailSkeleton } from "@/components/shared/loading-skeleton"
import {
  ArrowLeft,
  DollarSign,
  Building2,
  User,
  Trophy,
  XCircle,
  Save,
  Calendar,
  TrendingUp,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  Activity as ActivityIcon,
} from "lucide-react"
import { toast } from "sonner"

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.dealId as string

  const { data: deal, isLoading, error } = trpc.deals.getById.useQuery({ id: dealId })
  const utils = trpc.useUtils()

  const [editing, setEditing] = useState(false)
  const [formState, setFormState] = useState({
    title: "",
    value: "",
    stageId: "",
    probability: "",
    expectedCloseDate: "",
    lostReason: "",
  })

  const updateMutation = trpc.deals.update.useMutation({
    onSuccess: () => {
      toast.success("Deal updated")
      utils.deals.getById.invalidate({ id: dealId })
      setEditing(false)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update deal")
    },
  })

  const markWonMutation = trpc.deals.markWon.useMutation({
    onSuccess: () => {
      toast.success("Deal marked as won!")
      utils.deals.getById.invalidate({ id: dealId })
    },
    onError: (err) => {
      toast.error(err.message || "Failed to mark deal as won")
    },
  })

  const markLostMutation = trpc.deals.markLost.useMutation({
    onSuccess: () => {
      toast.success("Deal marked as lost")
      utils.deals.getById.invalidate({ id: dealId })
    },
    onError: (err) => {
      toast.error(err.message || "Failed to mark deal as lost")
    },
  })

  function startEditing() {
    if (!deal) return
    setFormState({
      title: deal.title,
      value: deal.value?.toString() ?? "",
      stageId: deal.stageId,
      probability: deal.probability?.toString() ?? "",
      expectedCloseDate: deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
        : "",
      lostReason: deal.lostReason ?? "",
    })
    setEditing(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({
      id: dealId,
      title: formState.title.trim() || undefined,
      value: formState.value ? parseFloat(formState.value) : undefined,
      stageId: formState.stageId || undefined,
      probability: formState.probability ? parseInt(formState.probability) : undefined,
      expectedCloseDate: formState.expectedCloseDate || null,
      lostReason: formState.lostReason.trim() || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <DetailSkeleton />
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Deal not found or failed to load.
        </div>
      </div>
    )
  }

  const stages = deal.pipeline.stages ?? []
  const currentStageIndex = stages.findIndex((s) => s.id === deal.stageId)
  const progressPercent = stages.length > 1
    ? ((currentStageIndex + 1) / stages.length) * 100
    : 0

  const isWon = deal.closedWon === true
  const isLost = deal.closedWon === false && deal.actualCloseDate != null

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/deals")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{deal.title}</h1>
              <div className="mt-1 flex items-center gap-3 text-sm">
                {deal.value != null && (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(deal.value)}
                  </span>
                )}
                <Badge
                  variant="secondary"
                  style={deal.stage.color ? { backgroundColor: deal.stage.color, color: "#fff" } : undefined}
                >
                  {deal.stage.name}
                </Badge>
                {deal.probability != null && (
                  <Badge variant="outline">{deal.probability}% probability</Badge>
                )}
                {isWon && <Badge className="bg-green-600 text-white">Won</Badge>}
                {isLost && <Badge variant="destructive">Lost</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!isWon && !isLost && (
            <>
              <Button
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => markWonMutation.mutate({ id: dealId })}
                disabled={markWonMutation.isPending}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Mark Won
              </Button>
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => markLostMutation.mutate({ id: dealId })}
                disabled={markLostMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Mark Lost
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {deal.activities && deal.activities.length > 0 ? (
                    <div className="space-y-4">
                      {deal.activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <ActivityTypeIcon type={activity.type} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {activity.subject ?? activity.type.replace("_", " ")}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeDate(activity.createdAt)}
                              </span>
                            </div>
                            {activity.body && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {activity.body}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No activities recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Deal Details</CardTitle>
                  {!editing && (
                    <Button variant="outline" size="sm" onClick={startEditing}>
                      Edit
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {editing ? (
                    <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={formState.title}
                            onChange={(e) =>
                              setFormState((s) => ({ ...s, title: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Value</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formState.value}
                            onChange={(e) =>
                              setFormState((s) => ({ ...s, value: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Stage</Label>
                          <Select
                            value={formState.stageId}
                            onValueChange={(v) =>
                              setFormState((s) => ({ ...s, stageId: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Probability (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formState.probability}
                            onChange={(e) =>
                              setFormState((s) => ({ ...s, probability: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expected Close Date</Label>
                          <Input
                            type="date"
                            value={formState.expectedCloseDate}
                            onChange={(e) =>
                              setFormState((s) => ({
                                ...s,
                                expectedCloseDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lost Reason</Label>
                          <Input
                            value={formState.lostReason}
                            onChange={(e) =>
                              setFormState((s) => ({ ...s, lostReason: e.target.value }))
                            }
                            placeholder="If applicable..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={updateMutation.isPending}>
                          <Save className="mr-2 h-4 w-4" />
                          {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Title" value={deal.title} />
                      <Field
                        label="Value"
                        value={deal.value != null ? formatCurrency(deal.value) : undefined}
                      />
                      <Field label="Stage" value={deal.stage.name} />
                      <Field
                        label="Probability"
                        value={deal.probability != null ? `${deal.probability}%` : undefined}
                      />
                      <Field
                        label="Expected Close"
                        value={
                          deal.expectedCloseDate
                            ? formatAbsoluteDate(deal.expectedCloseDate)
                            : undefined
                        }
                      />
                      <Field label="Pipeline" value={deal.pipeline.name} />
                      <Field label="Lost Reason" value={deal.lostReason} />
                      <Field
                        label="Created"
                        value={formatAbsoluteDate(deal.createdAt)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Stage progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progressPercent} className="h-2" />
              <div className="flex flex-wrap gap-1">
                {stages.map((stage, idx) => (
                  <Badge
                    key={stage.id}
                    variant={idx <= currentStageIndex ? "default" : "outline"}
                    className={cn(
                      "text-xs",
                      idx === currentStageIndex && "ring-2 ring-primary ring-offset-1",
                      idx <= currentStageIndex
                        ? stage.color
                          ? ""
                          : "bg-primary"
                        : ""
                    )}
                    style={
                      idx <= currentStageIndex && stage.color
                        ? { backgroundColor: stage.color, color: "#fff" }
                        : undefined
                    }
                  >
                    {stage.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deal.contact ? (
                <Link
                  href={`/contacts/${deal.contact.id}`}
                  className="flex items-center gap-3 rounded-md p-2 -m-2 hover:bg-muted transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={cn("text-white text-xs", hashStringToColor(deal.contact.firstName + deal.contact.lastName))}>
                      {getInitials(deal.contact.firstName, deal.contact.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {deal.contact.firstName} {deal.contact.lastName}
                    </p>
                    {deal.contact.email && (
                      <p className="text-xs text-muted-foreground">{deal.contact.email}</p>
                    )}
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No contact linked</p>
              )}
            </CardContent>
          </Card>

          {/* Company card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Company
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deal.company ? (
                <Link
                  href={`/companies/${deal.company.id}`}
                  className="flex items-center gap-3 rounded-md p-2 -m-2 hover:bg-muted transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{deal.company.name}</p>
                    {deal.company.domain && (
                      <p className="text-xs text-muted-foreground">{deal.company.domain}</p>
                    )}
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No company linked</p>
              )}
            </CardContent>
          </Card>

          {/* Owner card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deal.ownerId ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">{deal.ownerId}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No owner assigned</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  )
}

function ActivityTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "CALL":
      return <Phone className="h-3.5 w-3.5 text-muted-foreground" />
    case "EMAIL":
      return <Mail className="h-3.5 w-3.5 text-muted-foreground" />
    case "MEETING":
      return <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
    case "NOTE":
      return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
    case "STAGE_CHANGE":
      return <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { formatRelativeDate, cn } from "@/lib/utils"
import {
  Mail,
  Clock,
  CheckSquare,
  Linkedin,
  Plus,
  Play,
  Pause,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import Link from "next/link"

const STEP_TYPES = ["EMAIL", "WAIT", "TASK", "LINKEDIN_VIEW", "LINKEDIN_CONNECT"] as const
type StepType = (typeof STEP_TYPES)[number]

const stepIcons: Record<StepType, React.ElementType> = {
  EMAIL: Mail,
  WAIT: Clock,
  TASK: CheckSquare,
  LINKEDIN_VIEW: Linkedin,
  LINKEDIN_CONNECT: Linkedin,
}

const stepColors: Record<StepType, string> = {
  EMAIL: "bg-purple-100 text-purple-700",
  WAIT: "bg-yellow-100 text-yellow-700",
  TASK: "bg-orange-100 text-orange-700",
  LINKEDIN_VIEW: "bg-blue-100 text-blue-700",
  LINKEDIN_CONNECT: "bg-blue-100 text-blue-700",
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  ARCHIVED: "destructive",
}

export default function SequenceDetailPage() {
  const params = useParams<{ sequenceId: string }>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stepType, setStepType] = useState<StepType>("EMAIL")
  const [stepSubject, setStepSubject] = useState("")
  const [stepBody, setStepBody] = useState("")
  const [stepWaitDays, setStepWaitDays] = useState("1")
  const [stepWaitHours, setStepWaitHours] = useState("0")

  const utils = trpc.useUtils()

  const { data: sequence, isLoading } = trpc.sequences.getById.useQuery(
    { id: params.sequenceId },
    { enabled: !!params.sequenceId }
  )

  const updateMutation = trpc.sequences.update.useMutation({
    onSuccess: () => {
      toast.success("Sequence updated")
      utils.sequences.getById.invalidate({ id: params.sequenceId })
    },
    onError: (err) => toast.error(err.message),
  })

  const addStepMutation = trpc.sequences.addStep.useMutation({
    onSuccess: () => {
      toast.success("Step added")
      utils.sequences.getById.invalidate({ id: params.sequenceId })
      setDialogOpen(false)
      resetStepForm()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetStepForm = () => {
    setStepType("EMAIL")
    setStepSubject("")
    setStepBody("")
    setStepWaitDays("1")
    setStepWaitHours("0")
  }

  const handleAddStep = () => {
    addStepMutation.mutate({
      sequenceId: params.sequenceId,
      type: stepType,
      order: (sequence?.steps.length ?? 0) + 1,
      subject: stepSubject || undefined,
      body: stepBody || undefined,
      waitDays: parseInt(stepWaitDays) || undefined,
      waitHours: parseInt(stepWaitHours) || undefined,
    })
  }

  const handleToggleStatus = () => {
    if (!sequence) return
    const newStatus = sequence.status === "ACTIVE" ? "PAUSED" : "ACTIVE"
    updateMutation.mutate({ id: params.sequenceId, status: newStatus })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!sequence) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Sequence not found
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {sequence.name}
            </h1>
            <Badge variant={statusVariant[sequence.status] ?? "secondary"}>
              {sequence.status}
            </Badge>
          </div>
          {sequence.description && (
            <p className="mt-1 text-muted-foreground">{sequence.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {sequence._count.enrollments} enrolled contacts
          </p>
        </div>
        <Button
          variant={sequence.status === "ACTIVE" ? "outline" : "default"}
          onClick={handleToggleStatus}
          disabled={updateMutation.isPending || sequence.status === "ARCHIVED"}
        >
          {sequence.status === "ACTIVE" ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </Button>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Steps</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Step
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Step</DialogTitle>
                <DialogDescription>
                  Add a new step to this sequence.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Step Type</Label>
                  <Select value={stepType} onValueChange={(v) => setStepType(v as StepType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(stepType === "EMAIL" || stepType === "TASK") && (
                  <>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={stepSubject}
                        onChange={(e) => setStepSubject(e.target.value)}
                        placeholder="Step subject..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Body</Label>
                      <Textarea
                        value={stepBody}
                        onChange={(e) => setStepBody(e.target.value)}
                        placeholder="Step content..."
                        rows={4}
                      />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Wait Days</Label>
                    <Input
                      type="number"
                      min="0"
                      value={stepWaitDays}
                      onChange={(e) => setStepWaitDays(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wait Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={stepWaitHours}
                      onChange={(e) => setStepWaitHours(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddStep}
                  disabled={addStepMutation.isPending}
                >
                  {addStepMutation.isPending ? "Adding..." : "Add Step"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {sequence.steps.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              No steps yet. Add your first step to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-0">
            {sequence.steps.map((step, index) => {
              const Icon = stepIcons[step.type as StepType] ?? Mail
              const colorClass = stepColors[step.type as StepType] ?? "bg-gray-100 text-gray-700"
              const waitText = [
                step.waitDays ? `${step.waitDays}d` : null,
                step.waitHours ? `${step.waitHours}h` : null,
              ]
                .filter(Boolean)
                .join(" ")

              return (
                <div key={step.id} className="relative">
                  {index > 0 && (
                    <div className="ml-6 h-6 border-l-2 border-dashed border-muted-foreground/30" />
                  )}
                  <Card>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", colorClass)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Step {step.order}
                          </span>
                          <Badge variant="secondary">{step.type.replace(/_/g, " ")}</Badge>
                          {waitText && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Wait {waitText}
                            </span>
                          )}
                        </div>
                        {step.subject && (
                          <p className="mt-1 font-medium">{step.subject}</p>
                        )}
                        {step.body && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {step.body}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Enrolled Contacts</h2>
        {sequence.enrollments.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              No contacts enrolled yet.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Enrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequence.enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <Link
                        href={`/contacts/${enrollment.contact.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {enrollment.contact.firstName} {enrollment.contact.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {enrollment.contact.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={enrollment.status === "ACTIVE" ? "default" : "secondary"}>
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>Step {enrollment.currentStep}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeDate(enrollment.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

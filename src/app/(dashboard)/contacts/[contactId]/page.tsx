"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import {
  formatRelativeDate,
  formatCurrency,
  contactStatusColors,
  cn,
  getInitials,
  hashStringToColor,
  enrichmentStatusColors,
} from "@/lib/utils"
import { ContactStatus, ActivityType } from "@prisma/client"
import { CONTACT_SOURCES } from "@/lib/constants"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  Calendar,
  CheckSquare,
  ArrowRight,
  Pencil,
  Settings,
  Plus,
  Building,
  User,
  Tag,
  BarChart3,
} from "lucide-react"

const activityIcons: Record<string, LucideIcon> = {
  CALL: Phone,
  EMAIL: Mail,
  NOTE: FileText,
  MEETING: Calendar,
  TASK: CheckSquare,
  STAGE_CHANGE: ArrowRight,
  FIELD_CHANGE: Pencil,
  SYSTEM: Settings,
}

interface EditFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  title: string
  source: string
  status: ContactStatus
  linkedinUrl: string
}

export default function ContactDetailPage({
  params,
}: {
  params: { contactId: string }
}) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const contactQuery = trpc.contacts.getById.useQuery({ id: params.contactId })
  const contact = contactQuery.data

  const [activityType, setActivityType] = useState<ActivityType | null>(null)
  const [activitySubject, setActivitySubject] = useState("")
  const [activityBody, setActivityBody] = useState("")
  const [editForm, setEditForm] = useState<EditFormState | null>(null)

  useEffect(() => {
    if (contact) {
      setEditForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        title: contact.title ?? "",
        source: contact.source ?? "",
        status: contact.status,
        linkedinUrl: contact.linkedinUrl ?? "",
      })
    }
  }, [contact])

  const createActivity = trpc.activities.create.useMutation({
    onSuccess: () => {
      toast.success("Activity logged")
      setActivityType(null)
      setActivitySubject("")
      setActivityBody("")
      utils.contacts.getById.invalidate({ id: params.contactId })
    },
    onError: (err) => toast.error(err.message),
  })

  const updateContact = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated")
      utils.contacts.getById.invalidate({ id: params.contactId })
    },
    onError: (err) => toast.error(err.message),
  })

  const handleLogActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityType) return
    createActivity.mutate({
      type: activityType,
      subject: activitySubject || undefined,
      body: activityBody || undefined,
      contactId: params.contactId,
    })
  }

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm) return
    updateContact.mutate({
      id: params.contactId,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email || undefined,
      phone: editForm.phone || undefined,
      title: editForm.title || undefined,
      source: editForm.source || undefined,
      status: editForm.status,
      linkedinUrl: editForm.linkedinUrl || undefined,
    })
  }

  if (contactQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (contactQuery.error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="py-12 text-center text-destructive">
          {contactQuery.error.message}
        </div>
      </div>
    )
  }

  if (!contact) return null

  const fullName = `${contact.firstName} ${contact.lastName}`
  const totalDealValue = contact.deals.reduce(
    (sum, d) => sum + (d.value ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/contacts")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Contacts
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback
                className={cn(
                  "text-lg text-white",
                  hashStringToColor(fullName)
                )}
              >
                {getInitials(contact.firstName, contact.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <Badge
                  className={cn(
                    "font-normal",
                    contactStatusColors[contact.status]
                  )}
                >
                  {contact.status}
                </Badge>
              </div>
              {contact.title && (
                <p className="text-muted-foreground">{contact.title}</p>
              )}
              {contact.company && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building className="h-3 w-3" />
                  {contact.company.name}
                </p>
              )}
            </div>
          </div>

          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="deals">
                Deals ({contact.deals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Log Activity
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setActivityType(ActivityType.NOTE)}
                    >
                      <FileText className="mr-2 h-4 w-4" /> Note
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setActivityType(ActivityType.CALL)}
                    >
                      <Phone className="mr-2 h-4 w-4" /> Call
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setActivityType(ActivityType.EMAIL)}
                    >
                      <Mail className="mr-2 h-4 w-4" /> Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {activityType && (
                <Card>
                  <CardContent className="pt-4">
                    <form
                      onSubmit={handleLogActivity}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {(() => {
                          const Icon =
                            activityIcons[activityType] ?? FileText
                          return <Icon className="h-4 w-4" />
                        })()}
                        New {activityType.toLowerCase()}
                      </div>
                      <Input
                        placeholder="Subject"
                        value={activitySubject}
                        onChange={(e) => setActivitySubject(e.target.value)}
                      />
                      <Textarea
                        placeholder="Details..."
                        value={activityBody}
                        onChange={(e) => setActivityBody(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={createActivity.isPending}
                        >
                          {createActivity.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActivityType(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {contact.activities.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No activities yet
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1">
                    {contact.activities.map((activity) => {
                      const Icon =
                        activityIcons[activity.type] ?? FileText
                      return (
                        <div
                          key={activity.id}
                          className="flex gap-3 rounded-lg border p-3"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                {activity.subject ?? activity.type}
                              </p>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatRelativeDate(activity.createdAt)}
                              </span>
                            </div>
                            {activity.body && (
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {activity.body}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="details">
              {editForm && (
                <form
                  onSubmit={handleUpdateContact}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={editForm.firstName}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            firstName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={editForm.lastName}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            lastName: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input
                      value={editForm.linkedinUrl}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          linkedinUrl: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select
                        value={editForm.source}
                        onValueChange={(v) =>
                          setEditForm({ ...editForm, source: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_SOURCES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editForm.status}
                        onValueChange={(v) =>
                          setEditForm({
                            ...editForm,
                            status: v as ContactStatus,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ContactStatus).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <Button
                    type="submit"
                    disabled={updateContact.isPending}
                  >
                    {updateContact.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="deals">
              {contact.deals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No deals associated with this contact
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">
                          Probability
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contact.deals.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell className="font-medium">
                            {deal.title}
                          </TableCell>
                          <TableCell className="text-right">
                            {deal.value != null
                              ? formatCurrency(deal.value)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {deal.stage.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {deal.probability != null
                              ? `${deal.probability}%`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" /> Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {contact.ownerId ?? "Unassigned"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4" /> Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map(({ tag }) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Enrichment</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                className={cn(
                  "font-normal",
                  enrichmentStatusColors[contact.enrichmentStatus]
                )}
              >
                {contact.enrichmentStatus}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" /> Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Activities</span>
                <span className="font-medium">
                  {contact.activities.length}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Deals</span>
                <span className="font-medium">
                  {contact.deals.length}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total Deal Value
                </span>
                <span className="font-medium">
                  {formatCurrency(totalDealValue)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lead Score</span>
                <span className="font-medium">
                  {contact.leadScore ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

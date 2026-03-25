"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { formatCurrency, formatRelativeDate, cn, contactStatusColors } from "@/lib/utils"
import { INDUSTRIES, HEADCOUNT_RANGES, FUNDING_STAGES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
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
import { DetailSkeleton } from "@/components/shared/loading-skeleton"
import {
  Building2,
  Globe,
  Users,
  DollarSign,
  ArrowLeft,
  ExternalLink,
  Save,
} from "lucide-react"
import { toast } from "sonner"

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.companyId as string

  const { data: company, isLoading, error } = trpc.companies.getById.useQuery({ id: companyId })
  const utils = trpc.useUtils()

  const [editing, setEditing] = useState(false)
  const [formState, setFormState] = useState({
    name: "",
    domain: "",
    industry: "",
    headcount: "",
    fundingStage: "",
    location: "",
    description: "",
    linkedinUrl: "",
    websiteUrl: "",
  })

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("Company updated")
      utils.companies.getById.invalidate({ id: companyId })
      setEditing(false)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update company")
    },
  })

  function startEditing() {
    if (!company) return
    setFormState({
      name: company.name || "",
      domain: company.domain || "",
      industry: company.industry || "",
      headcount: company.headcount || "",
      fundingStage: company.fundingStage || "",
      location: company.location || "",
      description: company.description || "",
      linkedinUrl: company.linkedinUrl || "",
      websiteUrl: company.websiteUrl || "",
    })
    setEditing(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formState.name.trim()) return
    updateMutation.mutate({
      id: companyId,
      name: formState.name.trim(),
      domain: formState.domain.trim() || undefined,
      industry: formState.industry || undefined,
      headcount: formState.headcount || undefined,
      fundingStage: formState.fundingStage || undefined,
      location: formState.location.trim() || undefined,
      description: formState.description.trim() || undefined,
      linkedinUrl: formState.linkedinUrl.trim() || undefined,
      websiteUrl: formState.websiteUrl.trim() || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <DetailSkeleton />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Company not found or failed to load.
        </div>
      </div>
    )
  }

  const totalPipelineValue =
    company.deals?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/companies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {company.domain && (
                  <a
                    href={`https://${company.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {company.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {company.industry && (
                  <Badge variant="secondary">{company.industry}</Badge>
                )}
                {company.headcount && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {company.headcount} employees
                  </span>
                )}
                {company.fundingStage && (
                  <Badge variant="outline" className="capitalize">
                    {company.fundingStage.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{company._count?.contacts ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{company._count?.deals ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold truncate">{company.location || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts ({company._count?.contacts ?? 0})
          </TabsTrigger>
          <TabsTrigger value="deals">
            Deals ({company._count?.deals ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Company Details</CardTitle>
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
                      <Label>Name *</Label>
                      <Input
                        value={formState.name}
                        onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Domain</Label>
                      <Input
                        value={formState.domain}
                        onChange={(e) => setFormState((s) => ({ ...s, domain: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select
                        value={formState.industry}
                        onValueChange={(v) => setFormState((s) => ({ ...s, industry: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((ind) => (
                            <SelectItem key={ind} value={ind}>
                              {ind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Headcount</Label>
                      <Select
                        value={formState.headcount}
                        onValueChange={(v) => setFormState((s) => ({ ...s, headcount: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          {HEADCOUNT_RANGES.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Funding Stage</Label>
                      <Select
                        value={formState.fundingStage}
                        onValueChange={(v) => setFormState((s) => ({ ...s, fundingStage: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {FUNDING_STAGES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={formState.location}
                        onChange={(e) => setFormState((s) => ({ ...s, location: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn URL</Label>
                      <Input
                        value={formState.linkedinUrl}
                        onChange={(e) => setFormState((s) => ({ ...s, linkedinUrl: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Website URL</Label>
                      <Input
                        value={formState.websiteUrl}
                        onChange={(e) => setFormState((s) => ({ ...s, websiteUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formState.description}
                      onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name" value={company.name} />
                  <Field label="Domain" value={company.domain} />
                  <Field label="Industry" value={company.industry} />
                  <Field label="Headcount" value={company.headcount} />
                  <Field
                    label="Funding Stage"
                    value={company.fundingStage?.replace("_", " ")}
                  />
                  <Field label="Location" value={company.location} />
                  <Field label="LinkedIn" value={company.linkedinUrl} />
                  <Field label="Website" value={company.websiteUrl} />
                  <div className="col-span-2">
                    <Field label="Description" value={company.description} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {company.contacts && company.contacts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.contacts.map((contact) => (
                      <TableRow
                        key={contact.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/contacts/${contact.id}`)}
                      >
                        <TableCell className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.title ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(contactStatusColors[contact.status])}
                          >
                            {contact.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No contacts linked to this company.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Deals</CardTitle>
              {totalPipelineValue > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Total pipeline: {formatCurrency(totalPipelineValue)}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {company.deals && company.deals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Probability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.deals.map((deal) => (
                      <TableRow
                        key={deal.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/deals/${deal.id}`)}
                      >
                        <TableCell className="font-medium">{deal.title}</TableCell>
                        <TableCell>
                          {deal.value ? formatCurrency(deal.value) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{deal.stage.name}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {deal.probability != null ? `${deal.probability}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No deals linked to this company.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

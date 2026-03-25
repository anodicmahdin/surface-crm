"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { toast } from "sonner"

const ENTITY_TYPES = ["CONTACT", "COMPANY", "DEAL"] as const
type EntityType = (typeof ENTITY_TYPES)[number]

const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "DATETIME",
  "SELECT",
  "MULTI_SELECT",
  "BOOLEAN",
  "URL",
  "EMAIL",
  "PHONE",
  "CURRENCY",
] as const
type FieldType = (typeof FIELD_TYPES)[number]

export default function CustomFieldsPage() {
  const [activeTab, setActiveTab] = useState<EntityType>("CONTACT")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fieldLabel, setFieldLabel] = useState("")
  const [fieldName, setFieldName] = useState("")
  const [fieldType, setFieldType] = useState<FieldType>("TEXT")
  const [isRequired, setIsRequired] = useState(false)
  const [options, setOptions] = useState("")

  const utils = trpc.useUtils()
  const { data: fields, isLoading } = trpc.customFields.list.useQuery({
    entityType: activeTab as EntityType,
  })

  const createMutation = trpc.customFields.create.useMutation({
    onSuccess: () => {
      toast.success("Custom field created")
      utils.customFields.list.invalidate()
      setDialogOpen(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetForm = () => {
    setFieldLabel("")
    setFieldName("")
    setFieldType("TEXT")
    setIsRequired(false)
    setOptions("")
  }

  const handleCreate = () => {
    if (!fieldLabel.trim()) return toast.error("Label is required")
    const name =
      fieldName.trim() ||
      fieldLabel
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/(^_|_$)/g, "")

    createMutation.mutate({
      entityType: activeTab,
      fieldName: name,
      label: fieldLabel.trim(),
      fieldType,
      isRequired,
      options:
        fieldType === "SELECT" || fieldType === "MULTI_SELECT"
          ? options
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Fields</h1>
          <p className="text-muted-foreground">
            Define custom fields for your entities
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
              <DialogDescription>
                Add a new field to {activeTab.toLowerCase()} records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="e.g. Industry Vertical"
                />
              </div>
              <div className="space-y-2">
                <Label>Field Name (auto-generated if blank)</Label>
                <Input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. industry_vertical"
                />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select
                  value={fieldType}
                  onValueChange={(v) => setFieldType(v as FieldType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(fieldType === "SELECT" || fieldType === "MULTI_SELECT") && (
                <div className="space-y-2">
                  <Label>Options (comma separated)</Label>
                  <Input
                    value={options}
                    onChange={(e) => setOptions(e.target.value)}
                    placeholder="Option A, Option B, Option C"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  id="required"
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
                <Label htmlFor="required">Required field</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Field"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
        <TabsList>
          {ENTITY_TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        {ENTITY_TYPES.map((entityType) => (
          <TabsContent key={entityType} value={entityType}>
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
                      <TableHead>Label</TableHead>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!fields || fields.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-12 text-center text-muted-foreground"
                        >
                          No custom fields for {entityType.toLowerCase()} yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fields.map((field) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">
                            {field.label}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {field.fieldName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {field.fieldType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {field.isRequired ? (
                              <Badge>Required</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

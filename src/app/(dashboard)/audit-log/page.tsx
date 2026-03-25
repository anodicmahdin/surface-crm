"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { formatAbsoluteDate, cn } from "@/lib/utils"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ENTITY_TYPES = ["contact", "company", "deal", "pipeline", "automation", "sequence", "routing"] as const
const ACTION_TYPES = ["created", "updated", "deleted", "enriched", "enrolled", "stages_updated"] as const

const actionVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  created: "default",
  updated: "secondary",
  deleted: "destructive",
  enriched: "outline",
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [entityType, setEntityType] = useState<string>("ALL")
  const [action, setAction] = useState<string>("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = trpc.auditLog.list.useQuery({
    page,
    perPage: 25,
    entityType: entityType === "ALL" ? undefined : entityType,
    action: action === "ALL" ? undefined : action,
    dateRange:
      dateFrom || dateTo
        ? { from: dateFrom || undefined, to: dateTo || undefined }
        : undefined,
  })

  const renderJsonDiff = (oldVal: unknown, newVal: unknown) => {
    const oldStr = oldVal ? JSON.stringify(oldVal, null, 2) : null
    const newStr = newVal ? JSON.stringify(newVal, null, 2) : null

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {oldStr && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Previous</p>
            <pre className="max-h-40 overflow-auto rounded-md bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
              {oldStr}
            </pre>
          </div>
        )}
        {newStr && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">New</p>
            <pre className="max-h-40 overflow-auto rounded-md bg-green-50 p-3 text-xs text-green-800 dark:bg-green-950 dark:text-green-200">
              {newStr}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all changes made across the system
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Entity Type</Label>
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Action</Label>
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {ACTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="w-[160px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]" />
                <TableHead>Timestamp</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No audit log entries found
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((entry) => {
                  const isExpanded = expandedId === entry.id
                  const hasChanges = entry.oldValue || entry.newValue

                  return (
                    <>
                      <TableRow
                        key={entry.id}
                        className={cn(hasChanges && "cursor-pointer")}
                        onClick={() =>
                          hasChanges &&
                          setExpandedId(isExpanded ? null : entry.id)
                        }
                      >
                        <TableCell className="px-2">
                          {hasChanges &&
                            (isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ))}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatAbsoluteDate(entry.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.entityType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate font-mono text-xs">
                          {entry.entityId}
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionVariant[entry.action] ?? "outline"}>
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                          {entry.isSystemAction ? "System" : entry.userId ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.newValue
                            ? Object.keys(entry.newValue as Record<string, unknown>).length + " field(s)"
                            : "—"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasChanges && (
                        <TableRow key={`${entry.id}-expanded`}>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            {renderJsonDiff(entry.oldValue, entry.newValue)}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.totalCount} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

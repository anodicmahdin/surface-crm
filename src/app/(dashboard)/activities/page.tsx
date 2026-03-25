"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { formatRelativeDate, formatAbsoluteDate, cn } from "@/lib/utils"
import {
  Phone,
  Mail,
  FileText,
  Calendar,
  CheckSquare,
  GitBranch,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "NOTE",
  "MEETING",
  "TASK",
  "STAGE_CHANGE",
  "FIELD_CHANGE",
  "SYSTEM",
] as const

type ActivityType = (typeof ACTIVITY_TYPES)[number]

const activityIcons: Record<ActivityType, React.ElementType> = {
  CALL: Phone,
  EMAIL: Mail,
  NOTE: FileText,
  MEETING: Calendar,
  TASK: CheckSquare,
  STAGE_CHANGE: GitBranch,
  FIELD_CHANGE: Settings,
  SYSTEM: Settings,
}

const activityColors: Record<ActivityType, string> = {
  CALL: "bg-blue-100 text-blue-700",
  EMAIL: "bg-purple-100 text-purple-700",
  NOTE: "bg-yellow-100 text-yellow-700",
  MEETING: "bg-green-100 text-green-700",
  TASK: "bg-orange-100 text-orange-700",
  STAGE_CHANGE: "bg-pink-100 text-pink-700",
  FIELD_CHANGE: "bg-gray-100 text-gray-700",
  SYSTEM: "bg-gray-100 text-gray-700",
}

export default function ActivitiesPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const { data, isLoading } = trpc.activities.list.useQuery({
    page,
    perPage: 25,
    type: typeFilter === "ALL" ? undefined : (typeFilter as ActivityType),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
        <p className="text-muted-foreground">
          Global activity feed across all contacts and deals
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Activity Type</Label>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : data?.items.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              No activities found
            </CardContent>
          </Card>
        ) : (
          data?.items.map((activity) => {
            const Icon = activityIcons[activity.type as ActivityType] ?? Settings
            const colorClass = activityColors[activity.type as ActivityType] ?? "bg-gray-100 text-gray-700"

            return (
              <Card key={activity.id} className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {activity.type.replace(/_/g, " ")}
                      </Badge>
                      {activity.subject && (
                        <span className="truncate font-medium">
                          {activity.subject}
                        </span>
                      )}
                    </div>
                    {activity.body && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {activity.body}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {activity.contact && (
                        <Link
                          href={`/contacts/${activity.contact.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {activity.contact.firstName} {activity.contact.lastName}
                        </Link>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">
                              {formatRelativeDate(activity.createdAt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatAbsoluteDate(activity.createdAt)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

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

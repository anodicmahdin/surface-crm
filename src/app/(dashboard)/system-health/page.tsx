"use client"

import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import {
  Database,
  Zap,
  Mail,
  Webhook,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

type HealthStatus = "healthy" | "warning" | "error"

function StatusIndicator({ status }: { status: HealthStatus }) {
  if (status === "healthy") {
    return <CheckCircle className="h-5 w-5 text-green-500" />
  }
  if (status === "warning") {
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }
  return <XCircle className="h-5 w-5 text-red-500" />
}

function statusColor(status: HealthStatus) {
  if (status === "healthy") return "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
  if (status === "warning") return "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/30"
  return "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
}

export default function SystemHealthPage() {
  const { data: enrichmentStats, isLoading: enrichmentLoading } =
    trpc.enrichment.stats.useQuery()

  const enrichmentHealth: HealthStatus = enrichmentStats
    ? enrichmentStats.failed > enrichmentStats.total * 0.2
      ? "error"
      : enrichmentStats.failed > enrichmentStats.total * 0.05
        ? "warning"
        : "healthy"
    : "healthy"

  const enrichmentRate = enrichmentStats && enrichmentStats.total > 0
    ? Math.round((enrichmentStats.enriched / enrichmentStats.total) * 100)
    : 0

  const subsystems = [
    {
      name: "Enrichment",
      icon: Database,
      status: enrichmentLoading ? ("healthy" as HealthStatus) : enrichmentHealth,
      loading: enrichmentLoading,
      stats: enrichmentStats
        ? [
            { label: "Total Contacts", value: enrichmentStats.total },
            { label: "Enriched", value: enrichmentStats.enriched },
            { label: "Failed", value: enrichmentStats.failed },
            { label: "Pending", value: enrichmentStats.pending },
            { label: "Stale", value: enrichmentStats.stale },
          ]
        : [],
      progress: enrichmentRate,
      progressLabel: `${enrichmentRate}% enrichment rate`,
    },
    {
      name: "Automations",
      icon: Zap,
      status: "healthy" as HealthStatus,
      loading: false,
      stats: [
        { label: "Status", value: "Operational" },
        { label: "Engine", value: "Active" },
      ],
      progress: null,
      progressLabel: null,
    },
    {
      name: "Sequences",
      icon: Mail,
      status: "healthy" as HealthStatus,
      loading: false,
      stats: [
        { label: "Status", value: "Operational" },
        { label: "Scheduler", value: "Running" },
      ],
      progress: null,
      progressLabel: null,
    },
    {
      name: "Webhooks",
      icon: Webhook,
      status: "healthy" as HealthStatus,
      loading: false,
      stats: [
        { label: "Status", value: "Operational" },
        { label: "Delivery", value: "Active" },
      ],
      progress: null,
      progressLabel: null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">
          Monitor the health of all Surface CRM subsystems
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {subsystems.map((sys) => (
          <Card key={sys.name} className={cn("transition-colors", statusColor(sys.status))}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <sys.icon className="h-5 w-5 text-muted-foreground" />
                  {sys.name}
                </div>
                {sys.loading ? (
                  <Skeleton className="h-5 w-5 rounded-full" />
                ) : (
                  <StatusIndicator status={sys.status} />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sys.loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {sys.stats.map((stat) => (
                      <div key={stat.label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {stat.label}
                        </span>
                        <span className="text-sm font-medium">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  {sys.progress !== null && (
                    <div className="space-y-1">
                      <Progress value={sys.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {sys.progressLabel}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

"use client"

import { trpc } from "@/lib/trpc"
import { formatCurrency, cn } from "@/lib/utils"
import {
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  CalendarDays,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import Link from "next/link"

export default function ReportsPage() {
  const { data: metrics, isLoading: metricsLoading } =
    trpc.reports.dashboardMetrics.useQuery()
  const { data: funnelData, isLoading: funnelLoading } =
    trpc.reports.pipelineFunnel.useQuery({})

  const metricCards = metrics
    ? [
        {
          label: "Open Deals",
          value: metrics.openDeals.count.toString(),
          subtext: formatCurrency(metrics.openDeals.value),
          icon: DollarSign,
          color: "text-green-600",
          bgColor: "bg-green-100",
        },
        {
          label: "Won This Month",
          value: metrics.wonDealsThisMonth.count.toString(),
          subtext: formatCurrency(metrics.wonDealsThisMonth.value),
          icon: TrendingUp,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
        },
        {
          label: "New Contacts",
          value: metrics.newContactsThisMonth.toString(),
          subtext: "this month",
          icon: Users,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
        },
        {
          label: "Activities",
          value: metrics.activitiesThisWeek.toString(),
          subtext: "this week",
          icon: Activity,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
        },
      ]
    : []

  const STAGE_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#a78bfa",
    "#c4b5fd",
    "#ddd6fe",
    "#22c55e",
    "#ef4444",
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Key metrics and pipeline analytics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-8 w-16" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : metricCards.map((m) => (
              <Card key={m.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      {m.label}
                    </p>
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        m.bgColor,
                        m.color
                      )}
                    >
                      <m.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-bold">{m.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.subtext}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Pipeline Funnel
          </CardTitle>
          <CardDescription>Deal count by pipeline stage</CardDescription>
        </CardHeader>
        <CardContent>
          {funnelLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : funnelData && funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} deals`]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {funnelData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STAGE_COLORS[index % STAGE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No pipeline data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/reports" className="block">
          <Card className="transition-colors hover:bg-muted/30">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Pipeline Report</p>
                <p className="text-sm text-muted-foreground">
                  Conversion rates across stages
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports" className="block">
          <Card className="transition-colors hover:bg-muted/30">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Activity Report</p>
                <p className="text-sm text-muted-foreground">
                  Team activity breakdown
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports" className="block">
          <Card className="transition-colors hover:bg-muted/30">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Deals Closing Soon</p>
                <p className="text-sm text-muted-foreground">
                  Deals expected to close this month
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

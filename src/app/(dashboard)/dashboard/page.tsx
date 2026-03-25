"use client"

import { trpc } from "@/lib/trpc"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { DollarSign, TrendingUp, Users, Activity } from "lucide-react"

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    payload: { name: string; count: number; value: number }
  }>
}) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <p className="font-medium">{data.name}</p>
      <p className="text-sm text-muted-foreground">{data.count} deals</p>
      <p className="text-sm font-medium">{formatCurrency(data.value)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const metrics = trpc.reports.dashboardMetrics.useQuery()
  const funnel = trpc.reports.pipelineFunnel.useQuery({})
  const closingDeals = trpc.reports.dealsClosingThisMonth.useQuery()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : metrics.error ? (
          <div className="col-span-4 text-center text-destructive">
            Failed to load metrics
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Open Deals
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.data?.openDeals.count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metrics.data?.openDeals.value ?? 0)} total
                  value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Won This Month
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.data?.wonDealsThisMonth.count}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metrics.data?.wonDealsThisMonth.value ?? 0)}{" "}
                  revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  New Contacts
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.data?.newContactsThisMonth}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Activities
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.data?.activitiesThisWeek}
                </div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {funnel.isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : funnel.data && funnel.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnel.data}>
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No pipeline data available
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deals Closing This Month</CardTitle>
        </CardHeader>
        <CardContent>
          {closingDeals.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : closingDeals.data && closingDeals.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Close Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closingDeals.data.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell>{deal.company?.name ?? "—"}</TableCell>
                    <TableCell>
                      {deal.contact
                        ? `${deal.contact.firstName} ${deal.contact.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{deal.stage.name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {deal.value != null ? formatCurrency(deal.value) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {deal.expectedCloseDate
                        ? new Date(deal.expectedCloseDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No deals closing this month
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

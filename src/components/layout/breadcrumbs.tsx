"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Fragment } from "react"

const routeLabels: Record<string, string> = {
  "": "Home",
  dashboard: "Dashboard",
  contacts: "Contacts",
  companies: "Companies",
  deals: "Deals",
  activities: "Activities",
  sequences: "Sequences",
  automations: "Automations",
  routing: "Routing",
  reports: "Reports",
  "audit-log": "Audit Log",
  settings: "Settings",
  "custom-fields": "Custom Fields",
  pipeline: "Pipeline",
  team: "Team",
  integrations: "Integrations",
  webhooks: "Webhooks",
  "system-health": "System Health",
  status: "Live status",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return <h1 className="text-lg font-semibold">Dashboard</h1>
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {segments.map((segment, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/")
        const label = routeLabels[segment] ?? segment
        const isLast = i === segments.length - 1

        return (
          <Fragment key={href}>
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            {isLast ? (
              <span className="font-medium">{label}</span>
            ) : (
              <Link href={href} className="text-muted-foreground hover:text-foreground">
                {label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}

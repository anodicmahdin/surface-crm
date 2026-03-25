"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSidebarStore } from "@/stores/sidebar-state"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
  LayoutDashboard, Users, Building2, Target, Activity,
  Mail, Zap, GitBranch, BarChart3, ScrollText,
  Settings, ChevronLeft, ChevronRight, Heart, Wifi,
} from "lucide-react"

const navigation = [
  { label: "Navigation", items: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Companies", href: "/companies", icon: Building2 },
    { name: "Deals", href: "/deals", icon: Target },
    { name: "Activities", href: "/activities", icon: Activity },
  ]},
  { label: "Outreach", items: [
    { name: "Sequences", href: "/sequences", icon: Mail },
  ]},
  { label: "Automation", items: [
    { name: "Automations", href: "/automations", icon: Zap },
    { name: "Routing", href: "/routing", icon: GitBranch },
  ]},
  { label: "Analytics", items: [
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Audit Log", href: "/audit-log", icon: ScrollText },
  ]},
  { label: "System", items: [
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "System Health", href: "/system-health", icon: Heart },
    { name: "Live status", href: "/status", icon: Wifi },
  ]},
]

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggle } = useSidebarStore()

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "relative flex h-full flex-col border-r bg-background transition-all duration-300",
          isCollapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        <div className={cn("flex h-14 items-center border-b px-4", isCollapsed && "justify-center px-2")}>
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Target className="h-6 w-6" />
              <span>Surface CRM</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", !isCollapsed && "ml-auto")}
            onClick={toggle}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {navigation.map((section) => (
              <div key={section.label} className="mb-2">
                {!isCollapsed && (
                  <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                )}
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  const Icon = item.icon

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-md mx-auto",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

"use client"

import {
  FormInput,
  GitBranch,
  Users,
  Plug,
  Webhook,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

const settingsCards = [
  {
    title: "Custom Fields",
    description: "Define custom fields for contacts, companies, and deals",
    icon: FormInput,
    href: "/settings/custom-fields",
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Pipeline Stages",
    description: "Configure pipeline stages, probabilities, and ordering",
    icon: GitBranch,
    href: "/settings/pipeline",
    color: "bg-purple-100 text-purple-700",
  },
  {
    title: "Team",
    description: "Manage team members, roles, and permissions",
    icon: Users,
    href: "/settings/team",
    color: "bg-green-100 text-green-700",
  },
  {
    title: "Integrations",
    description: "Connect with Gmail, Slack, Apollo, and more",
    icon: Plug,
    href: "/settings/integrations",
    color: "bg-orange-100 text-orange-700",
  },
  {
    title: "Webhooks",
    description: "Configure webhook endpoints for external integrations",
    icon: Webhook,
    href: "/settings/webhooks",
    color: "bg-pink-100 text-pink-700",
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your Surface CRM configuration
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Link key={card.title} href={card.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/30">
              <CardContent className="flex items-start gap-4 p-6">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.color}`}
                >
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

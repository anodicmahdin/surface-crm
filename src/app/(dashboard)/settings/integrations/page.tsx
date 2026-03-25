"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Mail, MessageSquare, Search, Database, CheckCircle2, Circle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

type IntegrationStatus = "connected" | "not_connected"

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ElementType
  status: IntegrationStatus
  color: string
}

const integrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync emails, track opens, and send sequences through Gmail",
    icon: Mail,
    status: "not_connected",
    color: "bg-red-100 text-red-700",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get deal notifications and activity alerts in Slack channels",
    icon: MessageSquare,
    status: "not_connected",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "apollo",
    name: "Apollo",
    description: "Enrich contacts and companies with Apollo.io data",
    icon: Search,
    status: "not_connected",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "clay",
    name: "Clay",
    description: "Advanced data enrichment and waterfall lookups via Clay",
    icon: Database,
    status: "not_connected",
    color: "bg-orange-100 text-orange-700",
  },
]

export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>(integrations)

  const handleConfigure = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "connected" ? "not_connected" : "connected",
            }
          : item
      )
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect Surface CRM with external services
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((integration) => (
          <Card key={integration.id} className="transition-colors hover:bg-muted/30">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      integration.color
                    )}
                  >
                    <integration.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <div className="mt-0.5">
                      {integration.status === "connected" ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Circle className="mr-1 h-3 w-3" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                {integration.description}
              </p>
              <Button
                variant={integration.status === "connected" ? "outline" : "default"}
                size="sm"
                onClick={() => handleConfigure(integration.id)}
              >
                {integration.status === "connected" ? "Disconnect" : "Configure"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

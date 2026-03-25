"use client"

import { Users, Shield, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Manage your team members, roles, and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Authentication & Team Management
          </CardTitle>
          <CardDescription>
            Team management is powered by Clerk. Use the Clerk dashboard to
            invite members, manage roles, and configure authentication settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="font-medium">Available via Clerk Dashboard</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Invite and manage team members
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Configure roles and permissions
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Set up SSO and MFA
              </li>
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                View active sessions
              </li>
            </ul>
          </div>
          <Button variant="outline" asChild>
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Clerk Dashboard
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

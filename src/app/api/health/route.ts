import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

type ServiceStatus = "ok" | "error" | "not_configured"

function hasEnv(key: string | undefined, minLen = 8): boolean {
  return Boolean(key && key.length >= minLen && !key.includes("[YOUR-PASSWORD]") && !key.includes("postgres.[REF]"))
}

export async function GET() {
  const started = Date.now()

  let database: { status: ServiceStatus; latencyMs?: number; message?: string } = {
    status: "not_configured",
    message: "DATABASE_URL not set or still placeholder",
  }

  if (hasEnv(process.env.DATABASE_URL) && process.env.DATABASE_URL!.startsWith("postgresql")) {
    try {
      const t0 = Date.now()
      await prisma.$queryRaw`SELECT 1`
      database = { status: "ok", latencyMs: Date.now() - t0 }
    } catch (e) {
      database = {
        status: "error",
        message: e instanceof Error ? e.message : "Connection failed",
      }
    }
  }

  let supabase: { status: ServiceStatus; latencyMs?: number; message?: string } = {
    status: "not_configured",
    message: "Missing URL or anon key",
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (supabaseUrl && anonKey) {
    try {
      const t0 = Date.now()
      const base = supabaseUrl.replace(/\/$/, "")
      let res = await fetch(`${base}/auth/v1/health`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        res = await fetch(`${base}/rest/v1/`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        })
      }
      const latencyMs = Date.now() - t0
      if (res.ok || res.status === 404 || res.status === 406) {
        supabase = { status: "ok", latencyMs }
      } else {
        supabase = {
          status: "error",
          latencyMs,
          message: `HTTP ${res.status}`,
        }
      }
    } catch (e) {
      supabase = {
        status: "error",
        message: e instanceof Error ? e.message : "Request failed",
      }
    }
  }

  const env = {
    clerk: hasEnv(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && hasEnv(process.env.CLERK_SECRET_KEY),
    supabaseKeys: Boolean(supabaseUrl && anonKey),
    apollo: hasEnv(process.env.APOLLO_API_KEY),
    clay: hasEnv(process.env.CLAY_API_KEY),
    resend: hasEnv(process.env.RESEND_API_KEY),
    slack: hasEnv(process.env.SLACK_WEBHOOK_URL),
    inngest: hasEnv(process.env.INNGEST_EVENT_KEY) && hasEnv(process.env.INNGEST_SIGNING_KEY),
    sentry: hasEnv(process.env.SENTRY_DSN),
    posthog: hasEnv(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    webhooks: hasEnv(process.env.WEBHOOK_SIGNING_SECRET),
    gmail: hasEnv(process.env.GOOGLE_CLIENT_ID) && hasEnv(process.env.GOOGLE_CLIENT_SECRET),
  }

  const summary = {
    database: database.status,
    supabaseApi: supabase.status,
    allCoreOk:
      database.status === "ok" &&
      supabase.status === "ok" &&
      env.clerk &&
      env.supabaseKeys,
  }

  return NextResponse.json({
    ok: summary.allCoreOk,
    timestamp: new Date().toISOString(),
    responseMs: Date.now() - started,
    services: {
      database,
      supabase,
    },
    env,
    summary,
  })
}

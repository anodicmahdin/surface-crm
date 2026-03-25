"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Database,
  Loader2,
  Radio,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

type HealthPayload = {
  ok: boolean
  timestamp: string
  responseMs: number
  services: {
    database: { status: string; latencyMs?: number; message?: string }
    supabase: { status: string; latencyMs?: number; message?: string }
  }
  env: Record<string, boolean>
  summary: {
    database: string
    supabaseApi: string
    allCoreOk: boolean
  }
}

function StatusDot({ status }: { status: string }) {
  if (status === "ok")
    return (
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
      </span>
    )
  if (status === "error")
    return <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
  return <span className="h-3 w-3 rounded-full bg-amber-400" />
}

function Row({
  icon: Icon,
  label,
  status,
  detail,
  latencyMs,
}: {
  icon: React.ElementType
  label: string
  status: string
  detail?: string
  latencyMs?: number
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/[0.07]">
      <div className="mt-0.5 rounded-lg bg-white/10 p-2">
        <Icon className="h-5 w-5 text-zinc-200" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{label}</p>
          <StatusDot status={status} />
          <span
            className={cn(
              "text-xs font-medium uppercase tracking-wide",
              status === "ok" && "text-emerald-400",
              status === "error" && "text-red-400",
              status === "not_configured" && "text-amber-300"
            )}
          >
            {status.replace("_", " ")}
          </span>
          {latencyMs != null && (
            <span className="text-xs text-zinc-500">{latencyMs}ms</span>
          )}
        </div>
        {detail && <p className="mt-1 text-sm text-zinc-400">{detail}</p>}
      </div>
      {status === "ok" ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
      ) : status === "error" ? (
        <XCircle className="h-5 w-5 shrink-0 text-red-400" />
      ) : null}
    </div>
  )
}

function EnvPill({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
        on
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
          : "border-white/10 bg-white/5 text-zinc-500"
      )}
    >
      <span className="font-mono text-xs">{label}</span>
      {on ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      ) : (
        <span className="text-[10px] uppercase text-zinc-600">off</span>
      )}
    </div>
  )
}

export default function StatusPage() {
  const [data, setData] = useState<HealthPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch("/api/health", { cache: "no-store" })
      if (!res.ok) throw new Error("Health check failed")
      setData(await res.json())
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050508] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.35),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(59,130,246,0.12),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_0%_80%,rgba(16,185,129,0.08),transparent)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              System status
            </h1>
            <p className="mt-2 max-w-xl text-zinc-400">
              Live checks for database, Supabase, and which integrations have keys configured. Refresh anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {err && (
          <div className="mb-8 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        {loading && !data && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
            <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
            <p>Running health checks…</p>
          </div>
        )}

        {data && (
          <>
            <div
              className={cn(
                "mb-8 rounded-2xl border p-6 backdrop-blur-xl",
                data.summary.allCoreOk
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/5"
              )}
            >
              <div className="flex flex-wrap items-center gap-3">
                <Activity className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="text-lg font-semibold text-white">
                    {data.summary.allCoreOk
                      ? "Core stack is healthy"
                      : "Some services need attention"}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Checked at {new Date(data.timestamp).toLocaleString()} · API{" "}
                    {data.responseMs}ms
                  </p>
                </div>
              </div>
            </div>

            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Live services
            </h2>
            <div className="space-y-3">
              <Row
                icon={Database}
                label="PostgreSQL (Prisma)"
                status={data.services.database.status}
                detail={data.services.database.message}
                latencyMs={data.services.database.latencyMs}
              />
              <Row
                icon={Radio}
                label="Supabase API (Auth health)"
                status={data.services.supabase.status}
                detail={data.services.supabase.message}
                latencyMs={data.services.supabase.latencyMs}
              />
            </div>

            <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Environment keys (configured / not)
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <EnvPill label="Clerk" on={data.env.clerk} />
              <EnvPill label="Supabase URL + anon" on={data.env.supabaseKeys} />
              <EnvPill label="Apollo" on={data.env.apollo} />
              <EnvPill label="Clay" on={data.env.clay} />
              <EnvPill label="Resend" on={data.env.resend} />
              <EnvPill label="Slack webhook" on={data.env.slack} />
              <EnvPill label="Inngest" on={data.env.inngest} />
              <EnvPill label="Sentry" on={data.env.sentry} />
              <EnvPill label="PostHog" on={data.env.posthog} />
              <EnvPill label="Inbound webhooks secret" on={data.env.webhooks} />
              <EnvPill label="Gmail OAuth" on={data.env.gmail} />
            </div>

            <p className="mt-10 text-center text-xs text-zinc-600">
              Keys are never exposed — only whether they are set in the server environment.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

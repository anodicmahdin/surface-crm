import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import {
  Activity,
  ArrowRight,
  BarChart3,
  LayoutGrid,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"

export default async function Home() {
  let userId: string | null = null
  try {
    const session = await auth()
    userId = session.userId
  } catch {
    userId = null
  }
  if (userId) {
    redirect("/dashboard")
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030306] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(99,102,241,0.28),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_100%,rgba(16,185,129,0.12),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Surface CRM</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/status"
            className="rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Status
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg bg-white px-4 py-2 font-medium text-zinc-900 transition hover:bg-zinc-100"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-violet-200 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            B2B outbound · Pipeline · Sequences
          </div>
          <h1 className="text-balance bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            Run high-volume outbound like a pro team
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-zinc-400">
            Kanban deals, contact timelines, sequences, automations, and routing — in one
            self-hosted CRM. Sign in to open the app, or check system status first.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-in"
              className="inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:from-violet-500 hover:to-indigo-500"
            >
              Open app
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/status"
              className="inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 font-medium text-white backdrop-blur transition hover:bg-white/10"
            >
              <Activity className="h-4 w-4" />
              System status
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: BarChart3,
              title: "Pipeline & deals",
              desc: "Kanban boards, stages, and forecasting in one place.",
            },
            {
              icon: Zap,
              title: "Automations",
              desc: "Triggers, routing rules, and sequences that scale with your team.",
            },
            {
              icon: Shield,
              title: "Audit & webhooks",
              desc: "Full trail of changes and integrations you control.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <item.icon className="mb-4 h-8 w-8 text-violet-400" />
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

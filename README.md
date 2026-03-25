# Surface CRM

A full-featured B2B outbound sales CRM built for modern sales teams. Manage contacts, companies, and deals — with built-in email sequences, automations, lead routing, and enrichment.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **API**: tRPC
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Auth**: Clerk
- **Background Jobs**: Inngest
- **Email**: Resend
- **Enrichment**: Apollo.io + Clay
- **UI**: Tailwind CSS + Radix UI

## Features

- **Contacts & Companies** — Full CRUD, filtering, bulk actions, tags, lead scoring
- **Deals Pipeline** — Kanban board with custom stages, win/loss tracking, forecasting
- **Email Sequences** — Multi-step drip campaigns with enrollment tracking
- **Automations** — Trigger-based rules (contact created, stage changed, etc.)
- **Lead Routing** — Round-robin, weighted, territory, and direct assignment
- **CSV Importer** — Drag & drop import with column mapping for contacts and companies
- **Enrichment** — Auto-enrich contacts and companies via Apollo.io / Clay
- **Custom Fields** — Define custom fields per entity (text, select, date, currency, etc.)
- **Audit Log** — Full change history with user attribution
- **Webhooks** — Outbound webhooks with signing and delivery history
- **Reports** — Pipeline funnel, KPIs, and deal forecasting

## Deploying to Vercel

### 1. Push to GitHub, then import project in Vercel

### 2. Set environment variables in Vercel dashboard

Copy all values from `.env.example`. The most important difference from local dev:

> **`DATABASE_URL` on Vercel must use the Supabase Transaction Pooler (port 6543), not the direct connection.**
> Found in Supabase → Settings → Database → Connection string → Transaction pooler
> Format: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

`DIRECT_URL` stays as the direct connection (port 5432) — used for migrations only.

### 3. Set build & output settings in Vercel

Vercel will auto-detect Next.js. The build command is already set in `package.json`:
```
prisma generate && next build
```

### 4. Run database migrations locally before deploying
```bash
npm run db:push
```
Migrations are run locally against your Supabase instance — not on Vercel.

---

## Getting Started (Local)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required services:
- [Supabase](https://supabase.com) — database
- [Clerk](https://clerk.com) — authentication
- [Resend](https://resend.com) — email
- [Inngest](https://inngest.com) — background jobs

Optional:
- [Apollo.io](https://apollo.io) — contact enrichment
- [Clay](https://clay.com) — contact enrichment
- Slack webhook URL — notifications

### 3. Set up the database

```bash
# Push schema to your database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Clear all data from database |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run inngest:dev` | Start Inngest dev server for background jobs |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/           # Sign in / sign up
│   ├── (dashboard)/      # Main app pages
│   └── api/              # API routes (tRPC, webhooks, Inngest)
├── components/
│   ├── layout/           # Sidebar, topbar, navigation
│   ├── shared/           # Reusable components (CSV importer, tables)
│   └── ui/               # Radix UI base components
├── server/
│   ├── trpc/routers/     # tRPC API routers
│   ├── services/         # Email, Slack, enrichment, audit
│   └── inngest/          # Background job functions
├── lib/                  # Utilities, Prisma client, tRPC client
└── stores/               # Zustand state stores
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (pooler) |
| `DIRECT_URL` | Supabase direct connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `RESEND_API_KEY` | Resend email API key |
| `INNGEST_EVENT_KEY` | Inngest event key |
| `INNGEST_SIGNING_KEY` | Inngest signing key |
| `APOLLO_API_KEY` | Apollo.io enrichment API key (optional) |
| `CLAY_API_KEY` | Clay enrichment API key (optional) |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL (optional) |

# Deploying to Vercel

## 1. Push your repo to GitHub / GitLab / Bitbucket

Import the repository in the [Vercel dashboard](https://vercel.com/new).

## 2. Environment variables

In **Project → Settings → Environment Variables**, add every key from `.env.example`.

**Minimum to boot the app:**

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase **Transaction pooler** URI (port **6543**). Required on Vercel. |
| `DIRECT_URL` | Supabase **direct** or session connection (port **5432**). Needed for `prisma migrate deploy`. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret (never expose to the client) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production `pk_live_...` when you go live |
| `CLERK_SECRET_KEY` | Matching secret key |
| `NEXT_PUBLIC_APP_URL` | **`https://your-project.vercel.app`** (your real production URL) |

Copy the rest from `.env.example` as you enable features (Inngest, Resend, etc.).

## 3. Database migrations

Run migrations **once** against production (from your machine or CI), not on every Vercel build:

```bash
# Set DATABASE_URL and DIRECT_URL to production values, then:
npx prisma migrate deploy
# If you use db push instead of migrations:
# npx prisma db push
```

Optional seed (usually only for staging):

```bash
DATABASE_URL="..." DIRECT_URL="..." npx tsx prisma/seed.ts
```

## 4. Clerk

1. **Clerk Dashboard → Configure → Domains** — add your Vercel URL (e.g. `https://xxx.vercel.app`).
2. **API Keys** — use **production** keys in Vercel **Production** env; keep **test** keys for **Preview** if you want.

## 5. Inngest

1. In [Inngest Cloud](https://app.inngest.com), set the app URL to:  
   `https://YOUR_VERCEL_DOMAIN/api/inngest`
2. Add `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to Vercel (same as local or production-specific).

## 6. Build settings (defaults are fine)

- **Framework Preset:** Next.js  
- **Build Command:** `pnpm build` or `npm run build` (both run `prisma generate && next build`)  
- **Install Command:** leave default (Vercel uses `pnpm` if `pnpm-lock.yaml` exists)

`vercel.json` increases timeouts for tRPC, Inngest, and webhooks.

## 7. After first deploy

- Open `/status` to verify env + DB + Supabase checks.
- Sign in via `/sign-in` and confirm redirects use `NEXT_PUBLIC_APP_URL` where relevant.

## Troubleshooting

- **Prisma connection errors:** Use the **pooled** `DATABASE_URL` (6543), not the direct URL, for runtime.
- **Middleware / Clerk errors:** Ensure the Vercel URL is allowed in Clerk and env vars are set for **Production** (not only Preview).

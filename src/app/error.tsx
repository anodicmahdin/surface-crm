"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const clerkMsg =
    error.message?.includes("Publishable key") ||
    error.message?.includes("Clerk")

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4 text-center text-zinc-100">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-zinc-400">
        {clerkMsg ? (
          <>
            Clerk rejected your publishable key. Open <code className="text-zinc-300">.env.local</code> and
            paste the exact keys from Clerk Dashboard → API Keys. The publishable key must end with{" "}
            <code className="text-zinc-300">k</code> (not <code className="text-zinc-300">=</code>). Then
            restart <code className="text-zinc-300">npm run dev</code>.
          </>
        ) : (
          error.message || "An unexpected error occurred."
        )}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  )
}

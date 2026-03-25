export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030306] text-zinc-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  )
}

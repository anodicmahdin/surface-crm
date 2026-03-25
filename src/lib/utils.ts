import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatRelativeDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatAbsoluteDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "MMM d, yyyy 'at' h:mm a")
}

export function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.charAt(0)?.toUpperCase() ?? ""
  const last = lastName?.charAt(0)?.toUpperCase() ?? ""
  return `${first}${last}` || "?"
}

export function hashStringToColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
  ]
  return colors[Math.abs(hash) % colors.length]
}

export function toKebabCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
}

export function truncate(str: string, maxLen: number) {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + "..."
}

export const contactStatusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  CONTACTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  QUALIFIED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  UNQUALIFIED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  NURTURING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  CUSTOMER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  CHURNED: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
}

export const enrichmentStatusColors: Record<string, string> = {
  PENDING: "bg-zinc-100 text-zinc-600",
  ENRICHED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  STALE: "bg-yellow-100 text-yellow-700",
}

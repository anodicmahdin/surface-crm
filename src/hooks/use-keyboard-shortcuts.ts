"use client"

import { useEffect } from "react"

type ShortcutCallback = () => void

export function useKeyboardShortcut(
  keys: string[],
  callback: ShortcutCallback,
  options?: { enabled?: boolean }
) {
  useEffect(() => {
    if (options?.enabled === false) return

    const handler = (e: KeyboardEvent) => {
      const isMeta = keys.includes("meta") ? e.metaKey || e.ctrlKey : true
      const key = keys.find((k) => k !== "meta" && k !== "shift" && k !== "alt")

      if (key && isMeta && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        callback()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [keys, callback, options?.enabled])
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk"
import { Users, Building2, Target, Plus, BarChart3, Search } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { useDebounce } from "@/hooks/use-debounce"
import { formatCurrency } from "@/lib/utils"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  const { data: results } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 }
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const navigate = useCallback(
    (path: string) => {
      onOpenChange(false)
      setQuery("")
      router.push(path)
    },
    [router, onOpenChange]
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search contacts, companies, deals..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {debouncedQuery ? "No results found." : "Start typing to search..."}
        </CommandEmpty>

        {results?.contacts && results.contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {results.contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                onSelect={() => navigate(`/contacts/${contact.id}`)}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{contact.firstName} {contact.lastName}</span>
                {contact.email && (
                  <span className="ml-2 text-muted-foreground text-xs">{contact.email}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.companies && results.companies.length > 0 && (
          <CommandGroup heading="Companies">
            {results.companies.map((company) => (
              <CommandItem
                key={company.id}
                onSelect={() => navigate(`/companies/${company.id}`)}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span>{company.name}</span>
                {company.domain && (
                  <span className="ml-2 text-muted-foreground text-xs">{company.domain}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.deals && results.deals.length > 0 && (
          <CommandGroup heading="Deals">
            {results.deals.map((deal) => (
              <CommandItem
                key={deal.id}
                onSelect={() => navigate(`/deals/${deal.id}`)}
              >
                <Target className="mr-2 h-4 w-4" />
                <span>{deal.title}</span>
                <span className="ml-2 text-muted-foreground text-xs">
                  {deal.value ? formatCurrency(deal.value) : ""} · {deal.stage.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigate("/contacts?new=true")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Contact
          </CommandItem>
          <CommandItem onSelect={() => navigate("/deals?new=true")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Deal
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reports")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            View Reports
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

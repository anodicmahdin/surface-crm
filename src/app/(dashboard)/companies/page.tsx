"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from "@tanstack/react-table"
import { trpc } from "@/lib/trpc"
import { formatRelativeDate, cn } from "@/lib/utils"
import { INDUSTRIES, HEADCOUNT_RANGES, FUNDING_STAGES } from "@/lib/constants"
import { DEFAULT_PER_PAGE } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-skeleton"
import { CsvImporter } from "@/components/shared/csv-importer"
import {
  Building2,
  Plus,
  Upload,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
type CompanyRow = {
  id: string
  name: string
  domain: string | null
  industry: string | null
  headcount: string | null
  fundingStage: string | null
  location: string | null
  description: string | null
  createdAt: Date
  _count?: { contacts: number; deals: number }
  [key: string]: unknown
}

const columns: ColumnDef<CompanyRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "domain",
    header: "Domain",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.domain ?? "—"}</span>
    ),
  },
  {
    accessorKey: "industry",
    header: "Industry",
    cell: ({ row }) =>
      row.original.industry ? (
        <Badge variant="secondary">{row.original.industry}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "headcount",
    header: "Headcount",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.headcount ?? "—"}</span>
    ),
  },
  {
    accessorKey: "fundingStage",
    header: "Funding",
    cell: ({ row }) => (
      <span className="text-muted-foreground capitalize">
        {row.original.fundingStage?.replace("_", " ") ?? "—"}
      </span>
    ),
  },
  {
    id: "contactCount",
    header: "Contacts",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original._count?.contacts ?? 0}</span>
    ),
  },
  {
    id: "dealCount",
    header: "Deals",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original._count?.deals ?? 0}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatRelativeDate(row.original.createdAt)}
      </span>
    ),
  },
]

export default function CompaniesPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const [formName, setFormName] = useState("")
  const [formDomain, setFormDomain] = useState("")
  const [formIndustry, setFormIndustry] = useState("")
  const [formHeadcount, setFormHeadcount] = useState("")
  const [formFunding, setFormFunding] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formDescription, setFormDescription] = useState("")

  const sortParam = sorting.length
    ? { field: sorting[0].id, direction: sorting[0].desc ? "desc" as const : "asc" as const }
    : undefined

  const { data, isLoading, error } = trpc.companies.list.useQuery({
    page,
    perPage: DEFAULT_PER_PAGE,
    sort: sortParam,
    filters: search ? { search } : undefined,
  })

  const utils = trpc.useUtils()
  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success("Company created successfully")
      utils.companies.list.invalidate()
      resetForm()
      setSheetOpen(false)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create company")
    },
  })

  function resetForm() {
    setFormName("")
    setFormDomain("")
    setFormIndustry("")
    setFormHeadcount("")
    setFormFunding("")
    setFormLocation("")
    setFormDescription("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    createMutation.mutate({
      name: formName.trim(),
      domain: formDomain.trim() || undefined,
      industry: formIndustry || undefined,
      headcount: formHeadcount || undefined,
      fundingStage: formFunding || undefined,
      location: formLocation.trim() || undefined,
      description: formDescription.trim() || undefined,
    })
  }

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  })

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Failed to load companies. Please try again.
        </div>
      </div>
    )
  }

  const totalPages = data?.totalPages ?? 1
  const isEmpty = !isLoading && data?.items.length === 0 && !search

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage your company accounts and relationships.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Company
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Get started by adding your first company to track accounts and relationships."
          actionLabel="New Company"
          onAction={() => setSheetOpen(true)}
        />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={cn(
                              header.column.getCanSort() && "cursor-pointer select-none"
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-2">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No companies found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/companies/${row.original.id}`)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {data?.totalCount ?? 0} total companies
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Company</SheetTitle>
            <SheetDescription>
              Add a new company to your CRM.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Acme Inc."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="acme.com"
                value={formDomain}
                onChange={(e) => setFormDomain(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={formIndustry} onValueChange={setFormIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headcount">Headcount</Label>
              <Select value={formHeadcount} onValueChange={setFormHeadcount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {HEADCOUNT_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="funding">Funding Stage</Label>
              <Select value={formFunding} onValueChange={setFormFunding}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="San Francisco, CA"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief company description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                {createMutation.isPending ? "Creating..." : "Create Company"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <CsvImporter
        entityType="companies"
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => utils.companies.list.invalidate()}
      />
    </div>
  )
}

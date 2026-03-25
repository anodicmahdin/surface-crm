"use client"

import { useState, useMemo, useCallback, Suspense } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table"
import { trpc } from "@/lib/trpc"
import {
  formatRelativeDate,
  contactStatusColors,
  cn,
  getInitials,
  hashStringToColor,
} from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import { ContactStatus } from "@prisma/client"
import { CONTACT_SOURCES } from "@/lib/constants"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-skeleton"
import { CsvImporter } from "@/components/shared/csv-importer"
import {
  Plus,
  Upload,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Filter,
  Users,
} from "lucide-react"

interface ContactRow {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  title: string | null
  source: string | null
  status: ContactStatus
  leadScore: number | null
  createdAt: Date
  company: { id: string; name: string; domain: string | null } | null
  tags: { tag: { id: string; name: string; color: string | null } }[]
}

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
  source: "",
  status: "NEW" as ContactStatus,
  companyId: "",
}

function ContactsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get("page") ?? "1")
  const perPage = Number(searchParams.get("perPage") ?? "25")

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v)
        else params.delete(k)
      })
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, router]
  )

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState<ContactStatus[]>([])
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM)

  const utils = trpc.useUtils()

  const sortParam =
    sorting.length > 0
      ? {
          field: sorting[0].id,
          direction: (sorting[0].desc ? "desc" : "asc") as "asc" | "desc",
        }
      : undefined

  const contactsQuery = trpc.contacts.list.useQuery({
    page,
    perPage,
    sort: sortParam,
    filters: {
      search: debouncedSearch || undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      source: sourceFilter.length > 0 ? sourceFilter : undefined,
    },
  })

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact created successfully")
      setSheetOpen(false)
      setFormData(INITIAL_FORM)
      utils.contacts.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const bulkDeleteMutation = trpc.contacts.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} contact(s) deleted`)
      setRowSelection({})
      utils.contacts.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      title: formData.title || undefined,
      source: formData.source || undefined,
      status: formData.status,
      companyId: formData.companyId || undefined,
    })
  }

  const columns = useMemo<ColumnDef<ContactRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(!!v)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "firstName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const r = row.original
          const name = `${r.firstName} ${r.lastName}`
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className={cn(
                    "text-xs text-white",
                    hashStringToColor(name)
                  )}
                >
                  {getInitials(r.firstName, r.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.email ?? "—"}
          </span>
        ),
      },
      {
        id: "company",
        header: "Company",
        cell: ({ row }) => row.original.company?.name ?? "—",
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.title ?? "—",
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge
            className={cn(
              "font-normal",
              contactStatusColors[row.original.status]
            )}
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "leadScore",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Score
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.leadScore ?? 0,
      },
      {
        accessorKey: "source",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Source
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) =>
          row.original.source
            ? row.original.source.replace(/_/g, " ")
            : "—",
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => formatRelativeDate(row.original.createdAt),
      },
    ],
    []
  )

  const table = useReactTable({
    data: (contactsQuery.data?.items as ContactRow[] | undefined) ?? [],
    columns,
    pageCount: contactsQuery.data?.totalPages ?? -1,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  })

  const selectedIds = Object.keys(rowSelection)
  const totalPages = contactsQuery.data?.totalPages ?? 1
  const totalCount = contactsQuery.data?.totalCount ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} contact{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Contact
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <Filter className="mr-2 h-3 w-3" />
              Status
              {statusFilter.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1">
                  {statusFilter.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            {Object.values(ContactStatus).map((s) => (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={statusFilter.includes(s)}
                  onCheckedChange={(checked) =>
                    setStatusFilter((prev) =>
                      checked ? [...prev, s] : prev.filter((x) => x !== s)
                    )
                  }
                />
                {s}
              </label>
            ))}
            {statusFilter.length > 0 && (
              <>
                <Separator className="my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setStatusFilter([])}
                >
                  Clear
                </Button>
              </>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <Filter className="mr-2 h-3 w-3" />
              Source
              {sourceFilter.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1">
                  {sourceFilter.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            {CONTACT_SOURCES.map((s) => (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={sourceFilter.includes(s)}
                  onCheckedChange={(checked) =>
                    setSourceFilter((prev) =>
                      checked ? [...prev, s] : prev.filter((x) => x !== s)
                    )
                  }
                />
                {s.replace(/_/g, " ")}
              </label>
            ))}
            {sourceFilter.length > 0 && (
              <>
                <Separator className="my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setSourceFilter([])}
                >
                  Clear
                </Button>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => bulkDeleteMutation.mutate({ ids: selectedIds })}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}

      {contactsQuery.isLoading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : contactsQuery.error ? (
        <div className="py-8 text-center text-destructive">
          Failed to load contacts: {contactsQuery.error.message}
        </div>
      ) : contactsQuery.data && contactsQuery.data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description={
            debouncedSearch || statusFilter.length || sourceFilter.length
              ? "Try adjusting your search or filters"
              : "Get started by adding your first contact"
          }
          actionLabel={!debouncedSearch ? "Add Contact" : undefined}
          onAction={!debouncedSearch ? () => setSheetOpen(true) : undefined}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={() => router.push(`/contacts/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {contactsQuery.data && contactsQuery.data.totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={perPage.toString()}
              onValueChange={(v) => updateParams({ perPage: v, page: "1" })}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => updateParams({ page: (page - 1).toString() })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: (page + 1).toString() })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Contact</SheetTitle>
            <SheetDescription>Add a new contact to your CRM.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-firstName">First Name *</Label>
              <Input
                id="c-firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-lastName">Last Name *</Label>
              <Input
                id="c-lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-title">Title</Label>
              <Input
                id="c-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData({ ...formData, source: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData({ ...formData, status: v as ContactStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ContactStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-companyId">Company ID</Label>
              <Input
                id="c-companyId"
                value={formData.companyId}
                onChange={(e) =>
                  setFormData({ ...formData, companyId: e.target.value })
                }
                placeholder="Enter company ID"
              />
            </div>
            <Separator />
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Contact"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <CsvImporter
        entityType="contacts"
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => utils.contacts.list.invalidate()}
      />
    </div>
  )
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ContactsContent />
    </Suspense>
  )
}

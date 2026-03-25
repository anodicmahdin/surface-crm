"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from "@tanstack/react-table"
import { trpc } from "@/lib/trpc"
import { formatCurrency, formatRelativeDate, cn } from "@/lib/utils"
import { DEFAULT_PER_PAGE } from "@/lib/constants"
import { usePipelineViewStore } from "@/stores/pipeline-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
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
import { TableSkeleton, KanbanSkeleton } from "@/components/shared/loading-skeleton"
import {
  Kanban,
  TableIcon,
  Plus,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

// ─── TABLE VIEW ──────────────────────────────────────────────

function DealsTableView() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])

  const sortParam = sorting.length
    ? { field: sorting[0].id, direction: sorting[0].desc ? "desc" as const : "asc" as const }
    : undefined

  const { data, isLoading } = trpc.deals.list.useQuery({
    page,
    perPage: DEFAULT_PER_PAGE,
    sort: sortParam,
    filters: search ? { search } : undefined,
  })

  const columns: ColumnDef<NonNullable<typeof data>["items"][number]>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        id: "company",
        header: "Company",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.company?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => {
          const c = row.original.contact
          return (
            <span className="text-muted-foreground">
              {c ? `${c.firstName} ${c.lastName}` : "—"}
            </span>
          )
        },
      },
      {
        accessorKey: "value",
        header: "Value",
        cell: ({ row }) => (
          <span>{row.original.value ? formatCurrency(row.original.value) : "—"}</span>
        ),
      },
      {
        id: "stage",
        header: "Stage",
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            style={row.original.stage.color ? { backgroundColor: row.original.stage.color, color: "#fff" } : undefined}
          >
            {row.original.stage.name}
          </Badge>
        ),
      },
      {
        accessorKey: "probability",
        header: "Probability",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.probability != null ? `${row.original.probability}%` : "—"}
          </span>
        ),
      },
      {
        accessorKey: "expectedCloseDate",
        header: "Expected Close",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.expectedCloseDate
              ? formatRelativeDate(row.original.expectedCloseDate)
              : "—"}
          </span>
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
    ],
    []
  )

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  })

  const totalPages = data?.totalPages ?? 1

  if (isLoading) return <TableSkeleton rows={8} cols={8} />

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
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
                  No deals found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/deals/${row.original.id}`)}
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
        <p className="text-sm text-muted-foreground">{data?.totalCount ?? 0} total deals</p>
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
  )
}

// ─── DEAL CARD (Kanban) ──────────────────────────────────────

interface DealCardData {
  id: string
  title: string
  value: number | null
  probability: number | null
  expectedCloseDate: Date | string | null
  company?: { id: string; name: string } | null
  contact?: { id: string; firstName: string; lastName: string } | null
}

function SortableDealCard({ deal }: { deal: DealCardData }) {
  const router = useRouter()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex-1 cursor-pointer"
          onClick={() => router.push(`/deals/${deal.id}`)}
        >
          <p className="text-sm font-medium leading-tight">{deal.title}</p>
          {deal.company && (
            <p className="mt-1 text-xs text-muted-foreground">{deal.company.name}</p>
          )}
        </div>
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {deal.value ? formatCurrency(deal.value) : "—"}
        </span>
        {deal.probability != null && (
          <Badge variant="outline" className="text-xs">
            {deal.probability}%
          </Badge>
        )}
      </div>
      {deal.expectedCloseDate && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatRelativeDate(deal.expectedCloseDate)}
        </div>
      )}
    </div>
  )
}

function DealCardOverlay({ deal }: { deal: DealCardData }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg w-[260px]">
      <p className="text-sm font-medium">{deal.title}</p>
      {deal.company && (
        <p className="mt-1 text-xs text-muted-foreground">{deal.company.name}</p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {deal.value ? formatCurrency(deal.value) : "—"}
        </span>
        {deal.probability != null && (
          <Badge variant="outline" className="text-xs">{deal.probability}%</Badge>
        )}
      </div>
    </div>
  )
}

// ─── KANBAN COLUMN ───────────────────────────────────────────

interface StageColumn {
  id: string
  name: string
  color: string | null
  order: number
  deals: DealCardData[]
  _count?: { deals: number }
}

function KanbanColumn({
  stage,
  onAddDeal,
}: {
  stage: StageColumn
  onAddDeal: (stageId: string) => void
}) {
  const totalValue = stage.deals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color ?? "#6b7280" }}
          />
          <h3 className="text-sm font-semibold">{stage.name}</h3>
          <Badge variant="secondary" className="text-xs px-1.5">
            {stage.deals.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onAddDeal(stage.id)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="px-3 pb-2 text-xs text-muted-foreground">
        {formatCurrency(totalValue)}
      </p>
      <ScrollArea className="flex-1 px-2 pb-2">
        <SortableContext
          items={stage.deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 min-h-[40px]">
            {stage.deals.map((deal) => (
              <SortableDealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  )
}

// ─── KANBAN VIEW ─────────────────────────────────────────────

function DealsKanbanView({ onAddDeal }: { onAddDeal: (stageId: string) => void }) {
  const { data: pipeline, isLoading } = trpc.pipelines.getDefault.useQuery()
  const utils = trpc.useUtils()
  const moveMutation = trpc.deals.moveStage.useMutation({
    onSuccess: () => {
      utils.pipelines.getDefault.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to move deal")
      utils.pipelines.getDefault.invalidate()
    },
  })

  const [activeDealId, setActiveDealId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const allDeals = useMemo(() => {
    if (!pipeline) return new Map<string, DealCardData>()
    const map = new Map<string, DealCardData>()
    for (const stage of pipeline.stages) {
      for (const deal of stage.deals) {
        map.set(deal.id, deal)
      }
    }
    return map
  }, [pipeline])

  const findStageByDealId = useCallback(
    (dealId: string) => {
      if (!pipeline) return null
      return pipeline.stages.find((s) => s.deals.some((d) => d.id === dealId)) ?? null
    },
    [pipeline]
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null)
    const { active, over } = event
    if (!over || !pipeline) return

    const dealId = active.id as string
    const overStage = pipeline.stages.find(
      (s) => s.id === over.id || s.deals.some((d) => d.id === over.id)
    )
    if (!overStage) return

    const currentStage = findStageByDealId(dealId)
    if (!currentStage || currentStage.id === overStage.id) return

    moveMutation.mutate({
      dealId,
      newStageId: overStage.id,
      newPosition: overStage.deals.length,
    })
  }

  if (isLoading) return <KanbanSkeleton />

  if (!pipeline) {
    return (
      <EmptyState
        icon={Kanban}
        title="No pipeline found"
        description="Create a default pipeline to start managing your deals."
      />
    )
  }

  const activeDeal = activeDealId ? allDeals.get(activeDealId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" style={{ minHeight: 500 }}>
          {pipeline.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              onAddDeal={onAddDeal}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────

export default function DealsPage() {
  const { viewMode, setViewMode } = usePipelineViewStore()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [preselectedStageId, setPreselectedStageId] = useState("")

  const { data: pipeline } = trpc.pipelines.getDefault.useQuery()
  const utils = trpc.useUtils()

  const [formTitle, setFormTitle] = useState("")
  const [formValue, setFormValue] = useState("")
  const [formStageId, setFormStageId] = useState("")
  const [formProbability, setFormProbability] = useState("")
  const [formExpectedClose, setFormExpectedClose] = useState("")
  const [formContactId, setFormContactId] = useState("")
  const [formCompanyId, setFormCompanyId] = useState("")

  const createMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      toast.success("Deal created successfully")
      utils.deals.list.invalidate()
      utils.pipelines.getDefault.invalidate()
      resetForm()
      setSheetOpen(false)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create deal")
    },
  })

  function resetForm() {
    setFormTitle("")
    setFormValue("")
    setFormStageId("")
    setFormProbability("")
    setFormExpectedClose("")
    setFormContactId("")
    setFormCompanyId("")
    setPreselectedStageId("")
  }

  function openNewDealSheet(stageId?: string) {
    if (stageId) {
      setFormStageId(stageId)
      setPreselectedStageId(stageId)
    }
    setSheetOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !formStageId || !pipeline) return
    createMutation.mutate({
      title: formTitle.trim(),
      value: formValue ? parseFloat(formValue) : undefined,
      stageId: formStageId,
      pipelineId: pipeline.id,
      probability: formProbability ? parseInt(formProbability) : undefined,
      expectedCloseDate: formExpectedClose || undefined,
      contactId: formContactId || undefined,
      companyId: formCompanyId || undefined,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">
            Manage your sales pipeline and track deal progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <Kanban className="mr-1.5 h-4 w-4" />
              Board
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="mr-1.5 h-4 w-4" />
              Table
            </Button>
          </div>
          <Button onClick={() => openNewDealSheet()}>
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <DealsKanbanView onAddDeal={(stageId) => openNewDealSheet(stageId)} />
      ) : (
        <DealsTableView />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Deal</SheetTitle>
            <SheetDescription>Create a new deal in your pipeline.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deal-title">Title *</Label>
              <Input
                id="deal-title"
                placeholder="Enterprise deal"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal-value">Value</Label>
              <Input
                id="deal-value"
                type="number"
                step="0.01"
                placeholder="10000"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Stage *</Label>
              <Select value={formStageId} onValueChange={setFormStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {pipeline?.stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal-probability">Probability (%)</Label>
              <Input
                id="deal-probability"
                type="number"
                min="0"
                max="100"
                placeholder="50"
                value={formProbability}
                onChange={(e) => setFormProbability(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal-close">Expected Close Date</Label>
              <Input
                id="deal-close"
                type="date"
                value={formExpectedClose}
                onChange={(e) => setFormExpectedClose(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? "Creating..." : "Create Deal"}
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
    </div>
  )
}

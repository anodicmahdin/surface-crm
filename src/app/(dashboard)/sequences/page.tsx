"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { formatRelativeDate, cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toast } from "sonner"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  ARCHIVED: "destructive",
}

export default function SequencesPage() {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.sequences.list.useQuery({ page: 1, perPage: 50 })

  const createMutation = trpc.sequences.create.useMutation({
    onSuccess: (seq) => {
      toast.success("Sequence created")
      utils.sequences.list.invalidate()
      setSheetOpen(false)
      setName("")
      setDescription("")
      router.push(`/sequences/${seq.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleCreate = () => {
    if (!name.trim()) return toast.error("Name is required")
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sequences</h1>
          <p className="text-muted-foreground">
            Automated email sequences for outreach
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Sequence
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>New Sequence</SheetTitle>
              <SheetDescription>
                Create a new email sequence for outreach automation.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seq-name">Name</Label>
                <Input
                  id="seq-name"
                  placeholder="e.g. Cold Outreach v2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seq-desc">Description</Label>
                <Textarea
                  id="seq-desc"
                  placeholder="Describe the purpose of this sequence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Sequence"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Steps</TableHead>
                <TableHead className="text-center">Enrollments</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    No sequences yet. Create your first one!
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((seq) => (
                  <TableRow
                    key={seq.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/sequences/${seq.id}`)}
                  >
                    <TableCell className="font-medium">{seq.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[seq.status] ?? "secondary"}>
                        {seq.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {seq._count.steps}
                    </TableCell>
                    <TableCell className="text-center">
                      {seq._count.enrollments}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeDate(seq.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

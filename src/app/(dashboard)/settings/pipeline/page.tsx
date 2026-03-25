"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { Save, GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type StageEdit = {
  id: string
  name: string
  color: string
  order: number
  probability: number
  isClosedWon: boolean
  isClosedLost: boolean
}

export default function PipelineSettingsPage() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("")
  const [stages, setStages] = useState<StageEdit[]>([])

  const utils = trpc.useUtils()
  const { data: pipelines, isLoading } = trpc.pipelines.list.useQuery()

  const updateStagesMutation = trpc.pipelines.updateStages.useMutation({
    onSuccess: () => {
      toast.success("Pipeline stages updated")
      utils.pipelines.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id)
    }
  }, [pipelines, selectedPipelineId])

  useEffect(() => {
    if (!pipelines || !selectedPipelineId) return
    const pipeline = pipelines.find((p) => p.id === selectedPipelineId)
    if (pipeline) {
      setStages(
        pipeline.stages.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color ?? "#6366f1",
          order: s.order,
          probability: s.probability ?? 0,
          isClosedWon: s.isClosedWon,
          isClosedLost: s.isClosedLost,
        }))
      )
    }
  }, [pipelines, selectedPipelineId])

  const updateStageField = (index: number, field: keyof StageEdit, value: string | number | boolean) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], [field]: value }
    setStages(updated)
  }

  const handleSave = () => {
    if (!selectedPipelineId) return
    updateStagesMutation.mutate({
      pipelineId: selectedPipelineId,
      stages: stages.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        order: s.order,
        probability: s.probability,
        isClosedWon: s.isClosedWon,
        isClosedLost: s.isClosedLost,
      })),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline Stages</h1>
          <p className="text-muted-foreground">
            Configure stages, colors, and probabilities
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateStagesMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateStagesMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {pipelines && pipelines.length > 1 && (
        <div className="space-y-2">
          <Label>Pipeline</Label>
          <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        {stages.map((stage, index) => (
          <Card key={stage.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span className="w-6 text-center text-sm font-medium">
                  {stage.order}
                </span>
              </div>
              <input
                type="color"
                value={stage.color}
                onChange={(e) => updateStageField(index, "color", e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border-0"
              />
              <Input
                value={stage.name}
                onChange={(e) => updateStageField(index, "name", e.target.value)}
                className="max-w-[200px]"
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={stage.probability}
                  onChange={(e) =>
                    updateStageField(index, "probability", parseInt(e.target.value) || 0)
                  }
                  className="w-[80px]"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs">Order</Label>
                <Input
                  type="number"
                  min="0"
                  value={stage.order}
                  onChange={(e) =>
                    updateStageField(index, "order", parseInt(e.target.value) || 0)
                  }
                  className="w-[70px]"
                />
              </div>
              <div className="flex items-center gap-2">
                {stage.isClosedWon && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                    Won
                  </Badge>
                )}
                {stage.isClosedLost && (
                  <Badge variant="destructive">Lost</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {stages.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              No stages configured for this pipeline.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

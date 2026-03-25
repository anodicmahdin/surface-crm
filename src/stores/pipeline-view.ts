import { create } from "zustand"
import { persist } from "zustand/middleware"

type ViewMode = "kanban" | "table"

interface PipelineViewState {
  viewMode: ViewMode
  selectedPipelineId: string | null
  setViewMode: (mode: ViewMode) => void
  setSelectedPipelineId: (id: string | null) => void
}

export const usePipelineViewStore = create<PipelineViewState>()(
  persist(
    (set) => ({
      viewMode: "kanban",
      selectedPipelineId: null,
      setViewMode: (mode) => set({ viewMode: mode }),
      setSelectedPipelineId: (id) => set({ selectedPipelineId: id }),
    }),
    { name: "pipeline-view" }
  )
)

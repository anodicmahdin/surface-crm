import { create } from "zustand"

interface FilterState {
  filters: Record<string, unknown>
  setFilter: (key: string, value: unknown) => void
  clearFilters: () => void
  clearFilter: (key: string) => void
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: {},
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  clearFilters: () => set({ filters: {} }),
  clearFilter: (key) =>
    set((state) => {
      const { [key]: _, ...rest } = state.filters
      return { filters: rest }
    }),
}))

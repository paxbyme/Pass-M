/**
 * breach.ts — Session-only Zustand store for breach scan results.
 * Results are never persisted to localStorage — they live only in memory
 * for the current session and must be re-fetched on next use.
 */

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreachState {
  /** credentialId → breach count (0 = clean, >0 = compromised) */
  results: Record<string, number>
  /** Unix timestamp (ms) of the last completed scan. null = never scanned. */
  lastChecked: number | null
  isChecking: boolean
  progress: { current: number; total: number } | null
  error: string | null
}

interface BreachActions {
  setResults: (results: Record<string, number>) => void
  setChecking: (isChecking: boolean, progress?: { current: number; total: number } | null) => void
  setError: (error: string | null) => void
  clearResults: () => void
}

type BreachStore = BreachState & BreachActions

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBreachStore = create<BreachStore>()((set) => ({
  results: {},
  lastChecked: null,
  isChecking: false,
  progress: null,
  error: null,

  setResults: (results) =>
    set({ results, lastChecked: Date.now(), isChecking: false, progress: null, error: null }),

  setChecking: (isChecking, progress = null) =>
    set({ isChecking, progress, error: null }),

  setError: (error) =>
    set({ isChecking: false, progress: null, error }),

  clearResults: () =>
    set({ results: {}, lastChecked: null, isChecking: false, progress: null, error: null }),
}))

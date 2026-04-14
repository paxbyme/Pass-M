/**
 * vault.ts — Zustand store for the decrypted credential list.
 * Credentials live here only while the vault is unlocked.
 * On lock, clearVault() wipes the array from memory.
 */

import { create } from "zustand";
import type { Credential } from "@/types";

// ---------------------------------------------------------------------------
// State & action types
// ---------------------------------------------------------------------------

type SortKey = "name" | "created" | "used" | "strength";
type SortDir = "asc" | "desc";

interface VaultState {
  credentials: Credential[];
  isLoading: boolean;
  searchQuery: string;
  filterCategory: string;
  filterTag: string;
  filterStrength: number | null;
  sortBy: SortKey;
  sortDir: SortDir;
}

interface VaultActions {
  setCredentials: (creds: Credential[]) => void;
  addCredential: (cred: Credential) => void;
  updateCredential: (id: string, updates: Partial<Credential>) => void;
  removeCredential: (id: string) => void;
  setSearch: (q: string) => void;
  setFilter: (
    filter: Partial<Pick<VaultState, "filterCategory" | "filterTag" | "filterStrength">>
  ) => void;
  setSort: (sortBy: SortKey, sortDir?: SortDir) => void;
  clearVault: () => void;
  getFilteredCredentials: () => Credential[];
}

type VaultStore = VaultState & VaultActions;

// ---------------------------------------------------------------------------
// Fuzzy search helper
// ---------------------------------------------------------------------------

/**
 * Returns true if the query appears as a contiguous subsequence of the target
 * (case-insensitive). This gives a simple but effective fuzzy match feel.
 */
function fuzzyMatch(target: string, query: string): boolean {
  if (!query) return true;
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length;
}

function credentialMatchesSearch(cred: Credential, query: string): boolean {
  if (!query.trim()) return true;
  const fields = [
    cred.name,
    cred.url,
    cred.username,
    cred.notes ?? "",
    ...cred.tags,
  ];
  return fields.some((field) => fuzzyMatch(field, query.trim()));
}

// ---------------------------------------------------------------------------
// Sorting comparator
// ---------------------------------------------------------------------------

function sortComparator(sortBy: SortKey, sortDir: SortDir): (a: Credential, b: Credential) => number {
  const dir = sortDir === "asc" ? 1 : -1;
  switch (sortBy) {
    case "name":
      return (a, b) => dir * a.name.localeCompare(b.name);
    case "created":
      return (a, b) => dir * (a.createdAt - b.createdAt);
    case "used":
      return (a, b) =>
        dir * ((a.lastAccessedAt ?? a.updatedAt) - (b.lastAccessedAt ?? b.updatedAt));
    case "strength":
      return (a, b) => dir * (a.passwordStrengthScore - b.passwordStrengthScore);
    default:
      return () => 0;
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialState: VaultState = {
  credentials: [],
  isLoading: false,
  searchQuery: "",
  filterCategory: "",
  filterTag: "",
  filterStrength: null,
  sortBy: "name",
  sortDir: "asc",
};

export const useVaultStore = create<VaultStore>()((set, get) => ({
  ...initialState,

  setCredentials: (creds) => set({ credentials: creds }),

  addCredential: (cred) =>
    set((state) => ({ credentials: [...state.credentials, cred] })),

  updateCredential: (id, updates) =>
    set((state) => ({
      credentials: state.credentials.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    })),

  removeCredential: (id) =>
    set((state) => ({
      credentials: state.credentials.filter((c) => c.id !== id),
    })),

  setSearch: (q) => set({ searchQuery: q }),

  setFilter: (filter) => set(filter),

  setSort: (sortBy, sortDir = "asc") => set({ sortBy, sortDir }),

  clearVault: () => set({ credentials: [], searchQuery: "" }),

  getFilteredCredentials: () => {
    const { credentials, searchQuery, filterCategory, filterTag, filterStrength, sortBy, sortDir } =
      get();

    let result = credentials.filter((cred) => {
      // Full-text fuzzy search across name, url, username, notes, tags
      if (!credentialMatchesSearch(cred, searchQuery)) return false;

      // Category filter
      if (filterCategory && cred.category !== filterCategory) return false;

      // Tag filter
      if (filterTag && !cred.tags.includes(filterTag)) return false;

      // Minimum strength filter
      if (
        filterStrength !== null &&
        cred.passwordStrengthScore < filterStrength
      )
        return false;

      return true;
    });

    result = [...result].sort(sortComparator(sortBy, sortDir));
    return result;
  },
}));

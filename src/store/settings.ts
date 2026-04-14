/**
 * settings.ts — Zustand store for non-sensitive vault settings.
 * Persisted to localStorage under 'passmSettings'.
 * Settings are not security-sensitive (no keys, no passwords).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VaultSettings } from "@/types";

// ---------------------------------------------------------------------------
// State & action types
// ---------------------------------------------------------------------------

interface SettingsActions {
  updateSettings: (partial: Partial<VaultSettings>) => void;
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
  addDepartment: (name: string) => void;
  removeDepartment: (name: string) => void;
}

type SettingsStore = VaultSettings & SettingsActions;

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

const defaultSettings: VaultSettings = {
  autoLockMinutes: 15,
  lockOnTabHidden: true,
  clipboardClearSeconds: 30,
  revealPasswordDefault: false,
  darkMode: "system",
  categories: ["Personal", "Work", "Finance", "Social", "Development"],
  departments: [],
  passwordExpiryDays: 90,
};

// ---------------------------------------------------------------------------
// Store with localStorage persistence
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      updateSettings: (partial) => set((state) => ({ ...state, ...partial })),

      addCategory: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed || state.categories.includes(trimmed)) return state;
          return { categories: [...state.categories, trimmed] };
        }),

      removeCategory: (name) =>
        set((state) => ({
          categories: state.categories.filter((c) => c !== name),
        })),

      addDepartment: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed || state.departments.includes(trimmed)) return state;
          return { departments: [...state.departments, trimmed] };
        }),

      removeDepartment: (name) =>
        set((state) => ({
          departments: state.departments.filter((d) => d !== name),
        })),
    }),
    {
      name: "passmSettings",
      // Persist the full settings object; skip function keys automatically
      partialize: (state): VaultSettings => ({
        autoLockMinutes: state.autoLockMinutes,
        lockOnTabHidden: state.lockOnTabHidden,
        clipboardClearSeconds: state.clipboardClearSeconds,
        revealPasswordDefault: state.revealPasswordDefault,
        companyName: state.companyName,
        darkMode: state.darkMode,
        categories: state.categories,
        departments: state.departments,
        passwordExpiryDays: state.passwordExpiryDays,
      }),
    }
  )
);

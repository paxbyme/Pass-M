/**
 * session.ts — In-memory Zustand store for the unlocked vault session.
 *
 * Intentionally NOT persisted: writing a CryptoKey to localStorage /
 * sessionStorage would expose it to XSS and browser extensions.
 * The key lives only in JS heap for the lifetime of the tab.
 */

import { create } from "zustand";

interface SessionState {
  isUnlocked: boolean;
  cryptoKey: CryptoKey | null;
  userId: string | null;
  email: string | null;
  lastActivity: number;
  salt: Uint8Array | null;
}

interface SessionActions {
  /**
   * Called after the user successfully derives their vault key.
   * Marks the session as unlocked and records the key in memory.
   */
  unlock: (
    key: CryptoKey,
    userId: string,
    email: string | null,
    salt: Uint8Array
  ) => void;

  /**
   * Locks the vault and clears all sensitive state from memory.
   */
  lock: () => void;

  /**
   * Updates lastActivity to the current timestamp.
   * Call this on any user interaction to reset the auto-lock timer.
   */
  updateActivity: () => void;
}

type SessionStore = SessionState & SessionActions;

const initialState: SessionState = {
  isUnlocked: false,
  cryptoKey: null,
  userId: null,
  email: null,
  lastActivity: 0,
  salt: null,
};

export const useSessionStore = create<SessionStore>()((set) => ({
  ...initialState,

  unlock: (key, userId, email, salt) =>
    set({
      isUnlocked: true,
      cryptoKey: key,
      userId,
      email,
      salt,
      lastActivity: Date.now(),
    }),

  lock: () =>
    set({
      isUnlocked: false,
      cryptoKey: null,   // dereferenced — eligible for GC
      userId: null,
      email: null,
      salt: null,
      lastActivity: 0,
    }),

  updateActivity: () => set({ lastActivity: Date.now() }),
}));

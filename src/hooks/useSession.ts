/**
 * useSession.ts — Inactivity-based auto-lock and tab-visibility lock.
 *
 * Reads autoLockMinutes and lockOnTabHidden from the settings store.
 * Resets the inactivity timer on mousemove, keydown, and click.
 * Locks the vault if the tab is hidden and lockOnTabHidden is enabled.
 * All event listeners are cleaned up on unmount.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";

export function useSession() {
  const { isUnlocked, lock, unlock, updateActivity } = useSessionStore();
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const lockOnTabHidden = useSettingsStore((s) => s.lockOnTabHidden);

  // Keep a stable ref to the timer ID so the cleanup effect can always cancel it
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    if (!isUnlocked) return;
    const ms = autoLockMinutes * 60 * 1000;
    timerRef.current = setTimeout(() => {
      lock();
    }, ms);
  }, [isUnlocked, autoLockMinutes, lock, clearTimer]);

  // ---------------------------------------------------------------------------
  // Activity listener — resets the inactivity timer
  // ---------------------------------------------------------------------------

  const handleActivity = useCallback(() => {
    if (!isUnlocked) return;
    updateActivity();
    resetTimer();
  }, [isUnlocked, updateActivity, resetTimer]);

  // ---------------------------------------------------------------------------
  // Visibility change — lock immediately when tab is hidden (if setting on)
  // ---------------------------------------------------------------------------

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && lockOnTabHidden && isUnlocked) {
      clearTimer();
      lock();
    }
  }, [lockOnTabHidden, isUnlocked, lock, clearTimer]);

  // ---------------------------------------------------------------------------
  // Effect: register/deregister all listeners whenever unlock state changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isUnlocked) {
      clearTimer();
      return;
    }

    // Start the initial timer
    resetTimer();

    const events = ["mousemove", "keydown", "click"] as const;
    events.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimer();
      events.forEach((e) => document.removeEventListener(e, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isUnlocked, resetTimer, handleActivity, handleVisibilityChange, clearTimer]);

  return { isUnlocked, lock, unlock };
}

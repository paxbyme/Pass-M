/**
 * useClipboard.ts — Clipboard write with auto-clear.
 *
 * `copy(text, clearAfterSeconds?)` writes to the clipboard, flips `copied`
 * to true for 2 s of UI feedback, then clears the clipboard after
 * clearAfterSeconds (defaults to settings.clipboardClearSeconds).
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { useSettingsStore } from "@/store/settings";

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const clipboardClearSeconds = useSettingsStore((s) => s.clipboardClearSeconds);

  // Refs so we can cancel pending timeouts on repeated calls
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string, clearAfterSeconds?: number): Promise<void> => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error("[useClipboard] Failed to write to clipboard:", err);
        return;
      }

      // -----------------------------------------------------------------------
      // Visual feedback: show "copied" state for 2 s
      // -----------------------------------------------------------------------
      if (feedbackTimerRef.current !== null) {
        clearTimeout(feedbackTimerRef.current);
      }
      setCopied(true);
      feedbackTimerRef.current = setTimeout(() => {
        setCopied(false);
        feedbackTimerRef.current = null;
      }, 2_000);

      // -----------------------------------------------------------------------
      // Schedule clipboard wipe
      // -----------------------------------------------------------------------
      const clearDelay = (clearAfterSeconds ?? clipboardClearSeconds) * 1_000;

      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current);
      }

      clearTimerRef.current = setTimeout(async () => {
        try {
          // Only clear if the clipboard still holds *our* text — avoids
          // wiping something the user intentionally pasted afterward.
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText("");
          }
        } catch {
          // readText can fail if document loses focus; silently ignore
        }
        clearTimerRef.current = null;
      }, clearDelay);
    },
    [clipboardClearSeconds]
  );

  return { copy, copied };
}

/**
 * ToastProvider.tsx — Radix UI Toast viewport wrapper.
 *
 * Renders the ToastProvider + ToastViewport at the bottom-right of the
 * screen.  Drop this into the root layout so any component can imperatively
 * dispatch toasts via Radix's `useToast` or a thin wrapper hook.
 */

"use client";

import { type ReactNode } from "react";
import * as Toast from "@radix-ui/react-toast";
import { cn } from "@/components/ui/cn";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {children}

      {/* Global viewport — positioned bottom-right via Tailwind */}
      <Toast.Viewport
        className={cn(
          // Layout
          "fixed bottom-0 right-0 z-[100]",
          "flex flex-col gap-2 p-4",
          "w-full max-w-sm",
          // Allow viewport itself to be interacted with
          "pointer-events-none [&>*]:pointer-events-auto",
          // Subtle entrance so it doesn't block viewport edge accessibility
          "outline-none"
        )}
      />
    </Toast.Provider>
  );
}

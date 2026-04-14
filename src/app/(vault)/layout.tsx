/**
 * (vault)/layout.tsx — Protected layout for all authenticated vault routes.
 *
 * Guards: if the vault is not unlocked, redirects to / (the lock / auth screen).
 * Renders: VaultHeader + page content wrapped in Framer Motion AnimatePresence
 * so route transitions animate in/out smoothly.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useSessionStore } from "@/store/session";
import { useSession } from "@/hooks/useSession";
import { VaultHeader } from "@/components/VaultHeader";

// ---------------------------------------------------------------------------
// Page transition variants
// ---------------------------------------------------------------------------

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function VaultLayout({ children }: { children: ReactNode }) {
  const isUnlocked = useSessionStore((s) => s.isUnlocked);
  const router = useRouter();

  // Activates inactivity auto-lock and tab-visibility lock
  useSession();

  useEffect(() => {
    if (!isUnlocked) {
      router.replace("/");
    }
  }, [isUnlocked, router]);

  // While the redirect is in flight don't render the protected content
  if (!isUnlocked) {
    return null;
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{
        background:
          'radial-gradient(ellipse 100% 50% at 50% 0%, hsl(243 40% 8%) 0%, hsl(240 15% 3.5%) 55%, hsl(240 12% 3%) 100%)',
      }}
    >
      <VaultHeader />

      {/* AnimatePresence enables exit animations when navigating away */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={typeof window !== "undefined" ? window.location.pathname : "vault"}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="flex flex-1 flex-col"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

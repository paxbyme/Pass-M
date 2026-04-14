/**
 * (auth)/layout.tsx — Layout for the auth group: lock screen + onboarding.
 *
 * Full-height, vertically/horizontally centred content on top of a subtle
 * multi-layer animated gradient using navy dark tones.  No navigation bar.
 */

"use client";

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Keyframe animation injected inline so we don't need a separate CSS module.
// (Tailwind's `animate-*` utilities don't cover arbitrary multi-stop shifts.)
// ---------------------------------------------------------------------------

const gradientKeyframes = `
  @keyframes authBgShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Inject keyframes once into the document head */}
      <style dangerouslySetInnerHTML={{ __html: gradientKeyframes }} />

      {/*
       * Outer shell — the animated gradient background.
       * Three navy-dark stops shift slowly to give depth without distraction.
       */}
      <div
        className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #05050f 0%, #0d0d2b 30%, #0a0a1f 55%, #060614 80%, #050510 100%)",
          backgroundSize: "400% 400%",
          animation: "authBgShift 18s ease infinite",
        }}
      >
        {/* Subtle radial glow centred behind the card — indigo tint */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(99,102,241,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Noise texture overlay for depth (CSS-only, no extra assets) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "200px 200px",
          }}
        />

        {/* Page content — centered, padded for small screens */}
        <main className="relative z-10 w-full max-w-md px-4 py-8 sm:py-16">
          {children}
        </main>
      </div>
    </>
  );
}

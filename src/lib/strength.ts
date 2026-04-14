/**
 * strength.ts — Password strength utilities for PassM.
 * Uses zxcvbn for realistic strength estimation.
 */

import zxcvbn from "zxcvbn";

// ---------------------------------------------------------------------------
// Color constants — exported for use in components
// ---------------------------------------------------------------------------

export const STRENGTH_COLORS = {
  text: {
    0: "text-red-500",
    1: "text-orange-500",
    2: "text-yellow-500",
    3: "text-teal-500",
    4: "text-green-500",
  },
  bg: {
    0: "bg-red-500",
    1: "bg-orange-500",
    2: "bg-yellow-500",
    3: "bg-teal-500",
    4: "bg-green-500",
  },
  hex: {
    0: "#ef4444",
    1: "#f97316",
    2: "#eab308",
    3: "#14b8a6",
    4: "#22c55e",
  },
} as const;

export const STRENGTH_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Very Weak",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Very Strong",
};

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  bgColor: string;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildResult(score: 0 | 1 | 2 | 3 | 4): StrengthResult {
  return {
    score,
    label: STRENGTH_LABELS[score],
    color: STRENGTH_COLORS.text[score],
    bgColor: STRENGTH_COLORS.bg[score],
    percentage: score * 25,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs zxcvbn on the password and returns a structured strength result.
 * Returns score 0 for empty / very short passwords without invoking zxcvbn.
 */
export function getStrength(password: string): StrengthResult {
  if (!password || password.length === 0) {
    return buildResult(0);
  }
  const result = zxcvbn(password);
  const score = Math.min(4, Math.max(0, result.score)) as 0 | 1 | 2 | 3 | 4;
  return buildResult(score);
}

/**
 * Returns a structured strength result from a pre-computed zxcvbn score.
 * Useful when the score is already stored (e.g. on vault entries).
 */
export function getStrengthForVault(score: number): StrengthResult {
  const clampedScore = Math.min(4, Math.max(0, Math.round(score))) as
    | 0
    | 1
    | 2
    | 3
    | 4;
  return buildResult(clampedScore);
}

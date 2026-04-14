/**
 * generator.ts — Cryptographically secure password generator for PassM.
 * Uses crypto.getRandomValues exclusively — never Math.random().
 */

// ---------------------------------------------------------------------------
// Character sets
// ---------------------------------------------------------------------------

const UPPERCASE_ALL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_ALL = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS_ALL = "0123456789";
const SYMBOLS_ALL = "!@#$%^&*()-_=+[]{}|;:,.<>?";

const AMBIGUOUS_CHARS = new Set(["0", "O", "l", "1", "I"]);

function filterAmbiguous(chars: string): string {
  return chars
    .split("")
    .filter((c) => !AMBIGUOUS_CHARS.has(c))
    .join("");
}

// ---------------------------------------------------------------------------
// Cryptographically secure random helpers
// ---------------------------------------------------------------------------

/**
 * Returns a cryptographically random integer in [0, max).
 */
function randomInt(max: number): number {
  if (max <= 0) throw new RangeError("max must be positive");
  // Rejection-sample to avoid modulo bias
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

/**
 * Fisher-Yates shuffle using cryptographically random indices.
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Generator options
// ---------------------------------------------------------------------------

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export const defaultOptions: GeneratorOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
};

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generates a password from the given options using crypto.getRandomValues.
 *
 * Guarantees:
 *  - At least one character from each enabled character set.
 *  - Cryptographically uniform distribution.
 *  - Ambiguous characters (0, O, l, 1, I) removed when excludeAmbiguous is true.
 *
 * Throws if no character sets are enabled or if the requested length is too
 * short to satisfy the guarantee (less than the number of enabled sets).
 */
export function generatePassword(options: GeneratorOptions): string {
  const {
    length,
    uppercase,
    lowercase,
    numbers,
    symbols,
    excludeAmbiguous,
  } = options;

  // Build per-set character pools
  const sets: string[] = [];

  if (uppercase) {
    const pool = excludeAmbiguous
      ? filterAmbiguous(UPPERCASE_ALL)
      : UPPERCASE_ALL;
    if (pool.length > 0) sets.push(pool);
  }
  if (lowercase) {
    const pool = excludeAmbiguous
      ? filterAmbiguous(LOWERCASE_ALL)
      : LOWERCASE_ALL;
    if (pool.length > 0) sets.push(pool);
  }
  if (numbers) {
    const pool = excludeAmbiguous
      ? filterAmbiguous(NUMBERS_ALL)
      : NUMBERS_ALL;
    if (pool.length > 0) sets.push(pool);
  }
  if (symbols) {
    sets.push(SYMBOLS_ALL);
  }

  if (sets.length === 0) {
    throw new Error("At least one character set must be enabled.");
  }
  if (length < sets.length) {
    throw new Error(
      `Password length (${length}) is too short to include one character from each enabled set (${sets.length} sets).`
    );
  }

  // Combined pool for filling remaining slots
  const fullPool = sets.join("");

  // 1. Guarantee one character from each set
  const required: string[] = sets.map(
    (set) => set[randomInt(set.length)]
  );

  // 2. Fill the remaining slots from the full combined pool
  const remaining: string[] = [];
  const fillCount = length - required.length;
  for (let i = 0; i < fillCount; i++) {
    remaining.push(fullPool[randomInt(fullPool.length)]);
  }

  // 3. Shuffle all characters together so required chars aren't always at the front
  const allChars = shuffleArray([...required, ...remaining]);

  return allChars.join("");
}

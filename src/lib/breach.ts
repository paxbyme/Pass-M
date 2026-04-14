/**
 * breach.ts — Password breach detection via HaveIBeenPwned k-anonymity API.
 *
 * Privacy model:
 *  1. The password is SHA-1 hashed entirely client-side.
 *  2. Only the first 5 hex characters (out of 40) are sent to HIBP.
 *  3. HIBP returns ~800 hash suffixes that share that prefix (+ padding noise).
 *  4. We check locally whether our full suffix appears in the response.
 *  5. The password — or anything that could reconstruct it — never leaves the device.
 *
 * Reference: https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
 */

/** SHA-1 hash a string; return uppercase hex */
async function sha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-1', encoder.encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/** Small random delay so we don't hammer HIBP */
function politeDelay(): Promise<void> {
  return new Promise((r) => setTimeout(r, 120 + Math.random() * 80))
}

/**
 * Check a single password against HIBP.
 * Returns the number of times it has appeared in known breach databases.
 * 0 = not found (clean). >0 = compromised.
 *
 * Throws on network errors or rate-limiting.
 */
export async function checkPasswordBreach(password: string): Promise<number> {
  const hash = await sha1Hex(password)
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    // Add-Padding prevents traffic-analysis attacks by making all
    // responses the same length regardless of result count.
    headers: { 'Add-Padding': 'true' },
  })

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Rate limited by HIBP — please wait a moment and try again.')
    }
    throw new Error(`HIBP API error (HTTP ${res.status}).`)
  }

  const text = await res.text()

  for (const line of text.split('\r\n')) {
    const [lineSuffix, rawCount] = line.split(':')
    if (lineSuffix?.trim() === suffix) {
      return parseInt(rawCount, 10) || 0
    }
  }

  return 0
}

/**
 * Scan every credential in the vault for breached passwords.
 * Results are returned as a Record<credentialId, breachCount>.
 *
 * @param credentials  Array of { id, password } objects
 * @param onProgress   Called after each credential is checked
 */
export async function checkVaultBreaches(
  credentials: Array<{ id: string; password: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, number>> {
  const results: Record<string, number> = {}
  const total = credentials.length

  for (let i = 0; i < total; i++) {
    const cred = credentials[i]
    results[cred.id] = await checkPasswordBreach(cred.password)
    onProgress?.(i + 1, total)
    if (i < total - 1) await politeDelay()
  }

  return results
}

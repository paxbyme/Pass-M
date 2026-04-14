/**
 * crypto.ts — Web Crypto API utilities for PassM
 * All encryption uses AES-GCM 256-bit with PBKDF2 key derivation.
 * Pure functions only — no side effects, no logging, no key exposure.
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const AES_KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

/**
 * Derives an AES-GCM CryptoKey from a master password and salt using PBKDF2.
 */
export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    rawKey,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a 16-byte cryptographically random salt.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Ensures a Uint8Array is backed by a plain ArrayBuffer (for Web Crypto). */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  if (
    u8.buffer instanceof ArrayBuffer &&
    u8.byteOffset === 0 &&
    u8.byteLength === u8.buffer.byteLength
  ) {
    return u8.buffer;
  }
  return u8.buffer instanceof ArrayBuffer
    ? u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
    : new Uint8Array(u8).buffer;
}

// ---------------------------------------------------------------------------
// Core encrypt / decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypts a UTF-8 string with AES-GCM.
 * Returns base64-encoded ciphertext and IV as separate strings.
 */
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = encoder.encode(data);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoded)
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts base64-encoded AES-GCM ciphertext back to a UTF-8 string.
 */
export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  const ciphertextBytes = base64ToBuffer(ciphertext);
  const ivBytes = base64ToBuffer(iv);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(ivBytes) },
    key,
    toArrayBuffer(ciphertextBytes)
  );

  return decoder.decode(plaintextBuffer);
}

// ---------------------------------------------------------------------------
// Vault entry helpers
// ---------------------------------------------------------------------------

/**
 * Serialises an object to JSON, encrypts it, and returns a compact
 * base64 blob: `<iv>.<ciphertext>`.
 */
export async function encryptVaultEntry(
  entry: object,
  key: CryptoKey
): Promise<string> {
  const json = JSON.stringify(entry);
  const { ciphertext, iv } = await encrypt(json, key);
  return `${iv}.${ciphertext}`;
}

/**
 * Decrypts a vault entry blob produced by `encryptVaultEntry`.
 */
export async function decryptVaultEntry(
  encrypted: string,
  key: CryptoKey
): Promise<object> {
  const dotIndex = encrypted.indexOf(".");
  if (dotIndex === -1) {
    throw new Error("Invalid encrypted vault entry format.");
  }
  const iv = encrypted.slice(0, dotIndex);
  const ciphertext = encrypted.slice(dotIndex + 1);
  const json = await decrypt(ciphertext, iv, key);
  return JSON.parse(json) as object;
}

// ---------------------------------------------------------------------------
// Password hashing (reuse detection only — NOT used for auth)
// ---------------------------------------------------------------------------

/**
 * Returns a hex-encoded SHA-256 digest of the password.
 * Intended only for local duplicate/reuse detection — not for authentication.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", toArrayBuffer(encoded));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Export / import encryption (separate password, separate key)
// ---------------------------------------------------------------------------

/**
 * Encrypts a data string using a freshly-derived key from exportPassword.
 * Returns a self-contained blob: `<saltB64>.<ivB64>.<ciphertextB64>`.
 */
export async function encryptExport(
  data: string,
  exportPassword: string
): Promise<string> {
  const salt = generateSalt();
  const key = await deriveKey(exportPassword, salt);
  const { ciphertext, iv } = await encrypt(data, key);
  const saltB64 = bufferToBase64(salt);
  return `${saltB64}.${iv}.${ciphertext}`;
}

/**
 * Decrypts a blob produced by `encryptExport` using the original export password.
 */
export async function decryptImport(
  encrypted: string,
  importPassword: string
): Promise<string> {
  const parts = encrypted.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted export format.");
  }
  const [saltB64, iv, ciphertext] = parts;
  const salt = base64ToBuffer(saltB64);
  const key = await deriveKey(importPassword, salt);
  return decrypt(ciphertext, iv, key);
}

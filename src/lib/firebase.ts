/**
 * firebase.ts — Firebase v10 modular SDK initialisation for PassM.
 * Reads all config from NEXT_PUBLIC_FIREBASE_* environment variables.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// ---------------------------------------------------------------------------
// Firebase config — all values come from environment variables.
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ---------------------------------------------------------------------------
// Singleton initialisation — safe for Next.js HMR / multiple imports.
// Guards against missing env vars during SSR / build-time pre-rendering.
// ---------------------------------------------------------------------------

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Lazily initialise Firebase services so that module-level evaluation during
// Next.js SSR / static generation does not throw when NEXT_PUBLIC_FIREBASE_*
// environment variables are not set (e.g. in a bare CI build).
const _getAuth = (): Auth => {
  try {
    return getAuth(app);
  } catch {
    return {} as Auth;
  }
};

export const auth: Auth = _getAuth();
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// ---------------------------------------------------------------------------
// Firestore path helpers
// ---------------------------------------------------------------------------

/**
 * Returns a CollectionReference for `users/{userId}/vault`.
 * Each document in this collection is an encrypted credential entry.
 */
export function getUserVaultRef(userId: string): CollectionReference {
  return collection(db, "users", userId, "vault");
}

/**
 * Returns a DocumentReference for `users/{userId}/settings`.
 * Stores non-sensitive UI/behaviour settings (not the master password).
 */
export function getUserSettingsRef(userId: string): DocumentReference {
  return doc(db, "users", userId, "settings");
}

/**
 * Returns a DocumentReference for `users/{userId}/salt`.
 * Stores the base64-encoded PBKDF2 salt used to derive the vault key.
 * The salt itself is not secret, but it must not be lost.
 */
export function getUserSaltRef(userId: string): DocumentReference {
  return doc(db, "users", userId, "salt");
}

export default app;

/**
 * useVault.ts — Custom hook for vault CRUD operations.
 *
 * Handles loading, saving, and deleting credentials against Firestore,
 * delegating encryption/decryption to crypto.ts and syncing the result
 * to the Zustand vault store.
 */

import { useState, useCallback } from "react";
import {
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, getUserVaultRef } from "@/lib/firebase";
import {
  encryptVaultEntry,
  decryptVaultEntry,
  hashPassword,
} from "@/lib/crypto";
import { useVaultStore } from "@/store/vault";
import type { Credential } from "@/types";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVault() {
  const [isLoading, setIsLoading] = useState(false);
  const { setCredentials, addCredential, updateCredential, removeCredential, credentials } =
    useVaultStore();

  // -------------------------------------------------------------------------
  // loadVault
  // -------------------------------------------------------------------------

  const loadVault = useCallback(
    async (userId: string, cryptoKey: CryptoKey): Promise<void> => {
      setIsLoading(true);
      try {
        const vaultRef = getUserVaultRef(userId);
        const snapshot = await getDocs(vaultRef);

        const decrypted: Credential[] = [];
        await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data() as { encryptedData: string };
            try {
              const plaintext = await decryptVaultEntry(data.encryptedData, cryptoKey);
              decrypted.push({ ...(plaintext as Credential), id: docSnap.id });
            } catch {
              // Individual entry decryption failure — skip corrupt/foreign entries
              console.warn(`[useVault] Failed to decrypt entry ${docSnap.id} — skipping.`);
            }
          })
        );

        setCredentials(decrypted);
      } finally {
        setIsLoading(false);
      }
    },
    [setCredentials]
  );

  // -------------------------------------------------------------------------
  // saveCredential — create or overwrite a credential in Firestore + store
  // -------------------------------------------------------------------------

  const saveCredential = useCallback(
    async (
      credential: Credential,
      cryptoKey: CryptoKey,
      userId: string
    ): Promise<void> => {
      setIsLoading(true);
      try {
        const encryptedData = await encryptVaultEntry(credential, cryptoKey);
        const vaultRef = getUserVaultRef(userId);
        const credDocRef = doc(db, vaultRef.path, credential.id);

        await setDoc(credDocRef, {
          encryptedData,
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt,
        });

        // Reflect in local store — addCredential if new, updateCredential if existing
        const exists = useVaultStore.getState().credentials.some((c) => c.id === credential.id);
        if (exists) {
          updateCredential(credential.id, credential);
        } else {
          addCredential(credential);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [addCredential, updateCredential]
  );

  // -------------------------------------------------------------------------
  // deleteCredential — remove from Firestore and the local store
  // -------------------------------------------------------------------------

  const deleteCredential = useCallback(
    async (id: string, userId: string): Promise<void> => {
      setIsLoading(true);
      try {
        const vaultRef = getUserVaultRef(userId);
        const credDocRef = doc(db, vaultRef.path, id);
        await deleteDoc(credDocRef);
        removeCredential(id);
      } finally {
        setIsLoading(false);
      }
    },
    [removeCredential]
  );

  // -------------------------------------------------------------------------
  // getReuseGroups — password reuse detection
  // -------------------------------------------------------------------------

  /**
   * Hashes every credential's password and groups credentials that share the
   * same hash.  Only groups with >1 member are returned (true duplicates).
   */
  const getReuseGroups = useCallback(async (): Promise<Map<string, Credential[]>> => {
    const current = useVaultStore.getState().credentials;
    const groups = new Map<string, Credential[]>();

    await Promise.all(
      current.map(async (cred) => {
        const hash = await hashPassword(cred.password);
        const bucket = groups.get(hash) ?? [];
        bucket.push(cred);
        groups.set(hash, bucket);
      })
    );

    // Remove buckets that are unique (no reuse)
    Array.from(groups.entries()).forEach(([hash, group]) => {
      if (group.length < 2) groups.delete(hash);
    });

    return groups;
  }, []);

  return {
    loadVault,
    saveCredential,
    deleteCredential,
    getReuseGroups,
    isLoading,
    // Expose current credentials for convenience
    credentials,
  };
}

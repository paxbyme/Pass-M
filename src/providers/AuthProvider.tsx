/**
 * AuthProvider.tsx — Firebase Auth listener + React context.
 *
 * Behaviour:
 *  - User signed in  + vault already unlocked  → keep full session state
 *  - User signed in  + vault is locked         → surface userId/email only
 *  - User signed out                           → call lock() to wipe session
 *
 * Consumers call `useAuth()` to access { user, loading }.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSessionStore } from "@/store/session";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { isUnlocked, lock } = useSessionStore();

  useEffect(() => {
    // Guard: auth is a stub `{}` when NEXT_PUBLIC_FIREBASE_* env vars are missing.
    // onAuthStateChanged would throw "is not a function" in that case.
    if (!auth || !('app' in auth)) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // If the vault is already unlocked (e.g. the user re-focused a tab)
        // we keep the full session state — do nothing beyond updating React state.
        // If the vault is locked we expose userId + email via the session store
        // so the unlock screen can pre-fill the email field, but we don't set
        // a cryptoKey because we don't have it.
        if (!isUnlocked) {
          useSessionStore.setState({
            userId: firebaseUser.uid,
            email: firebaseUser.email,
          });
        }
      } else {
        // Signed out — clear everything
        setUser(null);
        lock();
      }

      setLoading(false);
    });

    return () => unsubscribe();
    // isUnlocked intentionally omitted: we only want this to run when the
    // Firebase auth state actually changes, not every time the vault locks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lock]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

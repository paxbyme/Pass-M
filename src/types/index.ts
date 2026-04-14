export interface Credential {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
  tags: string[];
  category: string;
  department?: string;
  faviconUrl?: string;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  passwordStrengthScore: number;
  /** Timestamp (ms) when the password field was last changed. Used for expiry tracking. */
  passwordChangedAt?: number;
}

export interface EncryptedCredential {
  id: string;
  encryptedData: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultSettings {
  autoLockMinutes: number;
  lockOnTabHidden: boolean;
  clipboardClearSeconds: number;
  revealPasswordDefault: boolean;
  companyName?: string;
  darkMode: "system" | "light" | "dark";
  categories: string[];
  departments: string[];
  /** Days before a password is considered stale. 0 = disabled. Default 90. */
  passwordExpiryDays: number;
}

export interface SessionState {
  isUnlocked: boolean;
  cryptoKey: CryptoKey | null;
  userId: string | null;
  email: string | null;
  lastActivity: number;
}

export type StrengthLevel =
  | "very-weak"
  | "weak"
  | "fair"
  | "strong"
  | "very-strong";

import { createContext, useContext } from "react";
import type { AgeDeclaration } from "./age-declaration";
import type {
  createAdvertisingPrivacy,
  AdvertisingPrivacySnapshot,
} from "./advertising-privacy";

/** Installation state survives account changes; F09 only suppresses unnecessary entry prompts. */
export interface InstallationAge {
  declaration: AgeDeclaration | null;
  category: AgeDeclaration["category"];
  required: boolean;
  renewal: boolean;
  loading: boolean;
  readFailed: boolean;
  pending: boolean;
  /** Single SDK readiness and interstitial lifecycle, independent of installation persistence. */
  privacy: ReturnType<typeof createAdvertisingPrivacy>;
  nativePrivacy: AdvertisingPrivacySnapshot;
  /** Retries only the installation read after an explicit failure. */
  retryRead(): void;
  /** Acknowledges the write and native preparation before navigation; SDK failure never rolls back storage. */
  confirm(age: number): Promise<boolean> | undefined;
}

/** The existing installation owner supplies this context; importing its consumer starts no storage or native I/O. */
export const AgeContext = createContext<InstallationAge | null>(null);

/** Reads the installation's declaration and single privacy/advertising owner. */
export function useAgeDeclaration(): InstallationAge {
  const value = useContext(AgeContext);
  if (!value)
    throw new Error("Age declaration requires AgeDeclarationProvider");
  return value;
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { usePro } from "../pro";
import {
  getAgeDeclarationStatus,
  getAdvertisingAgeCategory,
  readAgeDeclaration,
  submitAgeDeclaration,
  type AgeDeclaration,
} from "./age-declaration";

/** Installation state survives account changes; F09 only suppresses unnecessary entry prompts. */
interface InstallationAge {
  declaration: AgeDeclaration | null;
  category: AgeDeclaration["category"];
  required: boolean;
  renewal: boolean;
  loading: boolean;
  readFailed: boolean;
  retryRead(): void;
  confirm(age: number): Promise<void>;
}

const AgeContext = createContext<InstallationAge | null>(null);

/** Reads when initial ordinary entry becomes possible, without a session key, account field or expiry timer. */
export function AgeDeclarationProvider({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) {
  const { state: pro } = usePro();
  const [evaluatedAt, setEvaluatedAt] = useState(() => new Date());
  const [declaration, setDeclaration] = useState<AgeDeclaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [readFailed, setReadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    readAgeDeclaration().then(
      (value) => {
        if (active) {
          setDeclaration(value);
          setLoading(false);
        }
      },
      () => {
        if (active) {
          setReadFailed(true);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, enabled]);

  /** Explicit recovery preserves storage ownership; no automatic retries or guessed declaration. */
  function retryRead() {
    setReadFailed(false);
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  /** Persistence success alone replaces the installation declaration; F05 transitions do not cancel it. */
  async function confirm(age: number) {
    const now = new Date();
    const saved = await submitAgeDeclaration(age, now);
    setEvaluatedAt(now);
    setDeclaration(saved);
  }

  const status = getAgeDeclarationStatus(declaration, evaluatedAt);
  return (
    <AgeContext
      value={{
        declaration,
        category: getAdvertisingAgeCategory(declaration, evaluatedAt),
        required: pro.status !== "active" && status !== "current",
        renewal: status === "expired",
        loading,
        readFailed,
        retryRead,
        confirm,
      }}
    >
      {children}
    </AgeContext>
  );
}

/** Reads the single local declaration owner; it authorizes no ad processing, account access or Pro right. */
export function useAgeDeclaration(): InstallationAge {
  const value = useContext(AgeContext);
  if (!value)
    throw new Error("Age declaration requires AgeDeclarationProvider");
  return value;
}

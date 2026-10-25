import {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  pending: boolean;
  /** Retries only the installation read after an explicit failure. */
  retryRead(): void;
  /** Starts one acknowledged write; an already active or disposed owner suppresses the action without success. */
  confirm(age: number): Promise<void> | undefined;
}

const AgeContext = createContext<InstallationAge | null>(null);

/** One acknowledged installation value and its read lifecycle; raw age remains in the submitting form. */
type DeclarationState =
  | { status: "loading" | "read-error"; evaluatedAt: Date }
  | { status: "ready"; evaluatedAt: Date; declaration: AgeDeclaration | null };

/** Reads when initial ordinary entry becomes possible, without a session key, account field or expiry timer. */
export function AgeDeclarationProvider({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) {
  const { state: pro } = usePro();
  const [state, setState] = useState<DeclarationState>(() => ({
    status: "loading",
    evaluatedAt: new Date(),
  }));
  const mounted = useRef(false);
  const submission = useRef<Promise<void> | undefined>(undefined);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || state.status !== "loading") return;
    let active = true;
    readAgeDeclaration().then(
      (value) => {
        if (active) {
          setState((current) => ({
            ...current,
            status: "ready",
            declaration: value,
          }));
        }
      },
      () => {
        if (active) {
          setState((current) => ({
            status: "read-error",
            evaluatedAt: current.evaluatedAt,
          }));
        }
      },
    );
    return () => {
      active = false;
    };
  }, [state.status, enabled]);

  /** Explicit recovery preserves storage ownership; no automatic retries or guessed declaration. */
  function retryRead() {
    if (state.status === "read-error")
      setState({ status: "loading", evaluatedAt: state.evaluatedAt });
  }

  /** One installation operation owns admission and busy state across form mounts; F05 neither cancels nor replays it. */
  function confirm(age: number): Promise<void> | undefined {
    if (!mounted.current || submission.current) return;
    setPending(true);
    const now = new Date();
    const operation = submitAgeDeclaration(age, now)
      .then((saved) => {
        if (mounted.current)
          setState({ status: "ready", evaluatedAt: now, declaration: saved });
      })
      .finally(() => {
        if (submission.current === operation) {
          submission.current = undefined;
          if (mounted.current) setPending(false);
        }
      });
    submission.current = operation;
    return operation;
  }

  const declaration = state.status === "ready" ? state.declaration : null;
  const status = getAgeDeclarationStatus(declaration, state.evaluatedAt);
  return (
    <AgeContext
      value={{
        declaration,
        category: getAdvertisingAgeCategory(declaration, state.evaluatedAt),
        required: pro.status !== "active" && status !== "current",
        renewal: status === "expired",
        loading: state.status === "loading",
        readFailed: state.status === "read-error",
        pending,
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

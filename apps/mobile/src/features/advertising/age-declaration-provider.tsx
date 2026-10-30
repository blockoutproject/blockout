import {
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { usePro } from "../pro";
import { useAccountSession } from "../accounts/current-account";
import { useAccessAdmission } from "../access/queries/use-access-admission";
import { createAdvertisingPrivacy } from "./advertising-privacy";
import { AgeContext } from "./age-declaration-context";
import {
  getAgeDeclarationStatus,
  getAdvertisingAgeCategory,
  readAgeDeclaration,
  submitAgeDeclaration,
  type AgeDeclaration,
} from "./age-declaration";

/** One acknowledged installation value and its read lifecycle; raw age remains in the submitting form. */
type DeclarationState =
  | { status: "loading" | "read-error"; evaluatedAt: Date }
  | { status: "ready"; evaluatedAt: Date; declaration: AgeDeclaration | null };

/** Reads when initial ordinary entry becomes possible, without a session key, account field or expiry timer. */
export function AgeDeclarationProvider({
  children,
  enabled,
  privacy,
}: PropsWithChildren<{
  enabled: boolean;
  privacy: ReturnType<typeof createAdvertisingPrivacy>;
}>) {
  const proOwner = usePro();
  const pro = proOwner.state;
  const account = useAccountSession();
  const admission = useAccessAdmission();
  const [state, setState] = useState<DeclarationState>(() => ({
    status: "loading",
    evaluatedAt: new Date(),
  }));
  const mounted = useRef(false);
  const [pending, setPending] = useState(false);
  const category = getAdvertisingAgeCategory(
    state.status === "ready" ? state.declaration : null,
    state.evaluatedAt,
  );
  useLayoutEffect(() => {
    privacy.setContext(() => ({
      account,
      pro: proOwner.getState(),
      admission,
      category,
    }));
  });
  const nativePrivacy = useSyncExternalStore(
    privacy.subscribe,
    privacy.getSnapshot,
  );
  const ready =
    enabled &&
    state.status === "ready" &&
    admission.ordinary &&
    (pro.status === "active" ||
      getAgeDeclarationStatus(state.declaration, state.evaluatedAt) ===
        "current");
  useLayoutEffect(() => {
    privacy.suspend();
  }, [
    privacy,
    account.subject,
    account.accountId,
    account.status,
    pro.status,
    category,
    ready,
  ]);
  useEffect(() => {
    if (ready) void privacy.synchronize()?.catch(() => undefined);
  }, [
    privacy,
    ready,
    account.subject,
    account.accountId,
    account.status,
    pro.status,
    category,
    nativePrivacy.pending,
    pending,
    state,
  ]);
  useEffect(() => () => privacy.suspend(), [privacy]);

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

  /** Completes after persisted category acknowledgement; the effect prepares consent independently. */
  function confirm(age: number): Promise<boolean> | undefined {
    if (!mounted.current || pending || privacy.getSnapshot().pending) return;
    privacy.suspend();
    setPending(true);
    const now = new Date();
    return submitAgeDeclaration(age, now)
      .then((declaration) => {
        if (!mounted.current) return false;
        setState({ status: "ready", evaluatedAt: now, declaration });
        return true;
      })
      .finally(() => {
        if (mounted.current) setPending(false);
      });
  }

  const declaration = state.status === "ready" ? state.declaration : null;
  const status = getAgeDeclarationStatus(declaration, state.evaluatedAt);
  return (
    <AgeContext
      value={{
        declaration,
        category,
        required: pro.status !== "active" && status !== "current",
        renewal: status === "expired",
        loading: state.status === "loading",
        readFailed: state.status === "read-error",
        pending,
        privacy,
        nativePrivacy,
        retryRead,
        confirm,
      }}
    >
      {children}
    </AgeContext>
  );
}

/** Consumers share the same context without importing installation storage or SDK orchestration. */
export { useAgeDeclaration } from "./age-declaration-context";

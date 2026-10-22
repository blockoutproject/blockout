import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import Purchases from "react-native-purchases";
import { useAccountSession } from "../accounts/session/account-session-provider";
import { getProState, type ProOperation, type ProState } from "./pro-state";
import { proSession } from "./pro-session";

/** Current-session presentation and explicit commands; callbacks retain their rendering session. */
export interface ProContext {
  state: ProState;
  refreshing: boolean;
  verificationFailed: boolean;
  /** Reads current SDK information at entry/resume, without retrying failed association. */
  refresh(): Promise<void>;
  /** Explicitly retries current association or verification, never a purchase or restore. */
  retry(): void;
  /** Consumes an attributed native operation outcome and rereads ordinary SDK state. */
  completeOperation(operation: ProOperation): Promise<void>;
}

const ProSessionContext = createContext<ProContext | null>(null);

/**
 * Connects the process-wide native owner to F05 without gating navigation or local logout.
 * SDK listeners signal reads only; provider removal detaches subscriptions and clears presentation.
 */
export function ProProvider({ children }: PropsWithChildren) {
  const account = useAccountSession();
  const { status, subscribe, getSnapshot } = account;
  const native = useSyncExternalStore(
    proSession.subscribe,
    proSession.getSnapshot,
  );
  const session = account.getSnapshot();

  useLayoutEffect(() => {
    /** F05 publishes invalidation synchronously, before the React context rerenders. */
    function updateTarget() {
      const current = getSnapshot();
      proSession.setTarget(
        status === "authenticated" ? current : { ...current, accountId: null },
      );
    }
    updateTarget();
    return subscribe(updateTarget);
  }, [status, subscribe, getSnapshot]);

  useLayoutEffect(() => () => proSession.setTarget(null), []);

  useEffect(() => {
    /** Untagged SDK events and foreground entry trigger current reads under the SDK cache policy. */
    function readCurrent() {
      void proSession.refresh(getSnapshot());
    }
    Purchases.addCustomerInfoUpdateListener(readCurrent);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") readCurrent();
    });
    return () => {
      Purchases.removeCustomerInfoUpdateListener(readCurrent);
      foreground.remove();
    };
  }, [getSnapshot]);

  const current =
    native.evidence?.session.generation === session.generation &&
    native.evidence.session.accountId === session.accountId;
  return (
    <ProSessionContext
      value={{
        state: getProState(account, native.evidence),
        refreshing: current && native.refreshing,
        verificationFailed: current && native.verificationFailed,
        refresh: () => proSession.refresh(session),
        retry: () => proSession.retry(session),
        completeOperation: (operation) =>
          proSession.completeOperation(session, operation),
      }}
    >
      {children}
    </ProSessionContext>
  );
}

/** Reads F09's narrow current-session API; consumers own navigation, ads and provider UI. */
export function usePro(): ProContext {
  const value = useContext(ProSessionContext);
  if (!value) throw new Error("usePro requires ProProvider");
  return value;
}

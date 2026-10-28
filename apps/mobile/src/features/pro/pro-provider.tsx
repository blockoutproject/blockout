import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import Purchases from "react-native-purchases";
import type { CustomerInfo } from "react-native-purchases";
import { useAccountSession } from "../accounts/current-account";
import { getProState, type ProOperation, type ProState } from "./pro-state";
import { proSession } from "./pro-session";

/** Current-session presentation and explicit commands; callbacks retain their rendering session. */
export interface ProContext {
  state: ProState;
  /** Reads the owner’s current projection for native callbacks, without copying SDK evidence. */
  getState(): ProState;
  refreshing: boolean;
  verificationFailed: boolean;
  /** Returns the current accepted read outcome, or undefined for an obsolete/unstarted attempt. */
  refresh(): Promise<boolean | undefined>;
  /** Retries association or verification, never payment; only an accepted verification returns an outcome. */
  retry(): Promise<boolean | undefined>;
  /** Consumes an attributed native operation outcome and rereads ordinary SDK state. */
  completeOperation(
    operation: ProOperation,
    customerInfo?: CustomerInfo,
  ): Promise<void>;
  /** Reserves one eligible native purchase synchronously; false must resume(false) at the SDK boundary. */
  beginPurchase(): boolean;
  /** Records an interrupted purchase as uncertain without cancelling the store transaction. */
  dismissPresentation(): Promise<void>;
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
  const refresh = useCallback(() => proSession.refresh(session), [session]);
  const retry = useCallback(() => proSession.retry(session), [session]);
  const completeOperation = useCallback(
    (operation: ProOperation, customerInfo?: CustomerInfo) =>
      proSession.completeOperation(session, operation, customerInfo),
    [session],
  );
  const beginPurchase = useCallback(
    () => proSession.beginPurchase(session),
    [session],
  );
  const dismissPresentation = useCallback(
    () => proSession.dismissPresentation(session),
    [session],
  );
  return (
    <ProSessionContext
      value={{
        state: getProState(account, native.evidence),
        getState: () => getProState(account, proSession.getSnapshot().evidence),
        refreshing: current && native.read !== null,
        verificationFailed: current && native.verificationFailed,
        refresh,
        retry,
        completeOperation,
        beginPurchase,
        dismissPresentation,
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

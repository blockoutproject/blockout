import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  useEffectEvent,
  useMemo,
  useRef,
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
  /** Records explicit provider restoration; false rejects obsolete/busy starts without replacing payment evidence. */
  beginRestore(): boolean;
  /** Explicitly invokes native restoration only after current-account association. */
  restore(): Promise<void>;
  /** Records an interrupted purchase/restoration as uncertain without cancelling the store transaction. */
  dismissPresentation(): Promise<void>;
}
const ProSessionContext = createContext<ProContext | null>(null);
/**
 * Connects the process-wide native owner to F05 without gating navigation or local logout.
 * SDK listeners signal reads only; provider removal detaches subscriptions and clears presentation.
 */
export function ProProvider({ children }: PropsWithChildren) {
  const account = useAccountSession();
  const { status, subject, accountId } = account;
  const native = useSyncExternalStore(
    proSession.subscribe,
    proSession.getSnapshot,
  );
  const session = useMemo(() => ({ subject, accountId }), [subject, accountId]);
  // Native callbacks may outlive a removed route, but never their private principal/UUID lifetime.
  const mountedSession = useRef<typeof session | null>(session);
  useLayoutEffect(() => {
    mountedSession.current = session;
    return () => {
      mountedSession.current = null;
    };
  }, [session]);
  useLayoutEffect(() => {
    proSession.setTarget(
      status === "authenticated" ? session : { ...session, accountId: null },
    );
  }, [status, session]);
  useLayoutEffect(() => () => proSession.setTarget(null), []);
  const readCurrent = useEffectEvent(() => {
    void proSession.refresh(session);
  });
  useEffect(() => {
    const listener = () => readCurrent();
    Purchases.addCustomerInfoUpdateListener(listener);
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") readCurrent();
    });
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
      foreground.remove();
    };
  }, []);
  const current =
    native.evidence?.session.subject === session.subject &&
    native.evidence.session.accountId === session.accountId;
  const refresh = useCallback(() => proSession.refresh(session), [session]);
  const retry = useCallback(() => proSession.retry(session), [session]);
  const completeOperation = useCallback(
    (operation: ProOperation, customerInfo?: CustomerInfo) =>
      mountedSession.current === session
        ? proSession.completeOperation(session, operation, customerInfo)
        : Promise.resolve(),
    [session],
  );
  const beginPurchase = useCallback(
    () => proSession.beginPurchase(session),
    [session],
  );
  const beginRestore = useCallback(
    () =>
      mountedSession.current === session && proSession.beginRestore(session),
    [session],
  );
  const restore = useCallback(
    () =>
      mountedSession.current === session
        ? proSession.restore(session)
        : Promise.resolve(),
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
        beginRestore,
        restore,
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

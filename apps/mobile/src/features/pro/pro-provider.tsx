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
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Modal, StyleSheet } from "react-native";
import Constants from "expo-constants";
import RevenueCatUI from "react-native-purchases-ui";
import Purchases from "react-native-purchases";
import type { CustomerInfo, PurchasesOffering } from "react-native-purchases";
import { useAccountSession } from "@/features/accounts/current-account";
import { getProState, type ProOperation, type ProState } from "./pro-state";
import { proSession } from "./pro-session";
import { loadProOffering } from "./pro-offering";
import {
  purchaseErrorOutcome,
  restoreErrorOutcome,
  restoredProOperation,
} from "./pro-operations";

/** Current-session presentation and explicit commands; callbacks retain their rendering session. */
export interface ProContext {
  state: ProState;
  /** Reads the owner’s current projection for native callbacks, without copying SDK evidence. */
  getState(): ProState;
  /** Opens the explicit native offering after current account association; failures remain with the originating action. */
  openPaywall(): Promise<void>;
}

const ProSessionContext = createContext<ProContext | null>(null);

/**
 * Connects the process-wide native owner to F05 without gating navigation or local logout.
 * SDK listeners signal reads only; provider removal detaches subscriptions and clears presentation.
 */
export function ProProvider({
  children,
  presentationEnabled = true,
}: Readonly<PropsWithChildren<{ presentationEnabled?: boolean }>>) {
  const account = useAccountSession();
  const { status, subject, accountId } = account;
  const native = useSyncExternalStore(
    proSession.subscribe,
    proSession.getSnapshot,
  );
  const session = useMemo(() => ({ subject, accountId }), [subject, accountId]);
  const [host, setHost] = useState<{
    session: typeof session;
    offering: PurchasesOffering;
  } | null>(null);
  const liveHost = useRef<typeof host>(null);
  const opening = useRef<symbol | null>(null);
  // Native callbacks may outlive a removed Modal, but never their private principal/UUID lifetime.
  const mountedSession = useRef<typeof session | null>(session);
  useLayoutEffect(() => {
    mountedSession.current =
      status === "authenticated" && presentationEnabled ? session : null;
    return () => {
      mountedSession.current = null;
    };
  }, [session, status, presentationEnabled]);
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
      if (state === "active") {
        readCurrent();
      }
    });
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
      foreground.remove();
    };
  }, []);

  function completeOperation(
    operation: ProOperation,
    customerInfo?: CustomerInfo,
  ) {
    return proSession.completeOperation(session, operation, customerInfo);
  }

  const openPaywall = useCallback(async () => {
    if (mountedSession.current !== session || !accountId) {
      return;
    }
    const request = Symbol();
    opening.current = request;
    let offering: PurchasesOffering | null;
    try {
      if (!(await proSession.prepare(session))) {
        throw new Error("Pro association unavailable");
      }
      if (mountedSession.current !== session || opening.current !== request) {
        return;
      }
      offering = await loadProOffering(
        Constants.expoConfig?.extra?.revenueCat?.offeringIdentifier ?? "",
      );
      if (!offering) {
        throw new Error("Pro offering unavailable");
      }
    } catch (error) {
      if (mountedSession.current === session && opening.current === request) {
        throw error;
      }
      return;
    }
    if (mountedSession.current !== session || opening.current !== request) {
      return;
    }
    const next = { session, offering };
    liveHost.current = next;
    setHost(next);
  }, [session, accountId]);
  const currentHost =
    host &&
    status === "authenticated" &&
    presentationEnabled &&
    host.session === session
      ? host
      : null;

  // Retire a host in its owner’s render so later admission cannot reopen a disposed presentation.
  if (host && !currentHost) {
    setHost(null);
  }
  useLayoutEffect(() => {
    liveHost.current = null;
    opening.current = null;
  }, [session, status, presentationEnabled]);

  function close() {
    if (isCurrentHost()) {
      liveHost.current = null;
      opening.current = null;
      setHost(null);
    }
  }

  function isCurrentHost() {
    return (
      currentHost !== null &&
      liveHost.current === currentHost &&
      mountedSession.current === currentHost.session
    );
  }

  function finishRestore(customerInfo?: CustomerInfo, error?: unknown) {
    if (!isCurrentHost()) {
      return;
    }
    const state = getProState(account, proSession.getSnapshot().evidence);
    if (state.status === "guest") {
      return;
    }
    const outcome = customerInfo ? "restored" : restoreErrorOutcome(error);
    void completeOperation(
      restoredProOperation(state.operation, outcome),
      customerInfo,
    );
  }

  return (
    <ProSessionContext
      value={{
        state: getProState(account, native.evidence),
        getState: () => getProState(account, proSession.getSnapshot().evidence),
        openPaywall,
      }}
    >
      {children}
      {currentHost && (
        <Modal
          testID="pro-paywall-modal"
          visible
          onRequestClose={close}
          presentationStyle="fullScreen"
        >
          <RevenueCatUI.Paywall
            style={styles.provider}
            options={{
              offering: currentHost.offering,
              displayCloseButton: true,
            }}
            onDismiss={close}
            onPurchaseCompleted={({ customerInfo }) => {
              if (isCurrentHost()) {
                void completeOperation("purchased", customerInfo);
              }
            }}
            onPurchaseCancelled={() => {
              if (isCurrentHost()) {
                void completeOperation("cancelled");
              }
            }}
            onPurchaseError={({ error }) => {
              if (isCurrentHost()) {
                const outcome = purchaseErrorOutcome(error.code);
                void completeOperation(outcome);
              }
            }}
            onRestoreCompleted={({ customerInfo }) =>
              finishRestore(customerInfo)
            }
            onRestoreError={({ error }) => finishRestore(undefined, error)}
          />
        </Modal>
      )}
    </ProSessionContext>
  );
}

/** Reads current Pro state and requests the existing owner’s native paywall entry. */
export function usePro(): ProContext {
  const value = useContext(ProSessionContext);
  if (!value) {
    throw new Error("usePro requires ProProvider");
  }
  return value;
}

const styles = StyleSheet.create({ provider: { flex: 1 } });

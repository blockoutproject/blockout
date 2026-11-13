import { useMutation } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { StyleSheet } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import { useAccountSession } from "@/features/accounts/current-account";
import type { CustomerInfo } from "react-native-purchases";
import { usePro } from "../pro-provider";
import { canPurchasePro } from "../pro-offering";
import {
  purchaseErrorOutcome,
  restoredProOperation,
  restoreErrorOutcome,
} from "../pro-operations";
import { useProOffering } from "../api/use-pro-offering";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { ProRecovery } from "../components/pro-recovery";
import { hasAssociatedCustomer } from "../pro-presentation-state";
import type { ProState } from "../pro-state";
import { hasUnsettledProOperation } from "../components/pro-verification";

/** F12 admission, explicit management intent and the existing F10 navigation destination. */
export interface ProPresentationScreenProps {
  admitted: boolean;
  management?: boolean;
  onSupport?: () => void;
}

/**
 * Owns Pro admission/recovery with unwrapped, session-scoped provider content.
 * The SDK entitlement listener survives route removal; view callbacks, feedback and navigation do not.
 */
export function ProPresentationScreen({
  admitted,
  management = false,
  onSupport,
}: Readonly<ProPresentationScreenProps>) {
  const account = useAccountSession();
  const router = useRouter();
  const feedback = useActionFeedback({ retainOnUnmount: true });
  const { state, getState, refresh, restore, completeOperation } = usePro();
  const restoration = useMutation({
    mutationFn: restore,
    retry: false,
    networkMode: "always",
  });
  const [openedFor] = useState(() => ({
    subject: account.subject,
    accountId: account.accountId,
  }));
  const [view, setView] = useState<"automatic" | "management" | "outcome">(
    management ? "management" : "automatic",
  );
  const liveAccount = useRef(account);
  useLayoutEffect(() => {
    liveAccount.current = account;
  }, [account]);
  const closed = useRef(false);
  const restoreStarted = useRef(false);
  const paywallFinished = useRef(false);

  /** Reads the live F05 snapshot, including business UUID establishment for the native principal. */
  function isCurrentPresentation() {
    return (
      liveAccount.current.status === "authenticated" &&
      liveAccount.current.subject === openedFor.subject &&
      liveAccount.current.accountId === openedFor.accountId
    );
  }

  const current =
    account.status === "authenticated" &&
    openedFor.accountId !== null &&
    account.subject === openedFor.subject &&
    account.accountId === openedFor.accountId;
  const showPaywall = canPresentPaywall(view, state);
  const offering = useProOffering(admitted && current && showPaywall);
  const { refetch: readOffering } = offering;

  /** A safe catalogue retry leaves failure in Query and never repeats a purchase or publishes a toast. */
  async function retryOffering() {
    if (
      closed.current ||
      !isCurrentPresentation() ||
      !canPurchasePro(getState())
    ) {
      return;
    }
    feedback.clear();
    await readOffering();
  }

  /** Observes a provider-owned explicit restoration; the native UI owns store execution. */
  function startRestore() {
    if (closed.current || !isCurrentPresentation()) {
      return;
    }
    restoreStarted.current = hasAssociatedCustomer(getState());
  }

  /** Accepts one attributed native result without equating operation completion with active rights. */
  function finishRestore(customerInfo?: CustomerInfo, error?: unknown) {
    if (!restoreStarted.current || !isCurrentPresentation()) {
      return;
    }
    restoreStarted.current = false;
    const current = getState();
    if (current.status === "guest") {
      return;
    }
    const outcome = customerInfo ? "restored" : restoreErrorOutcome(error);
    void completeOperation(
      restoredProOperation(current.operation, outcome),
      customerInfo,
    );
    if (closed.current) {
      return;
    }
    if (outcome === "failed") {
      feedback.error();
    }
    if (!customerInfo) {
      return;
    }
    const completed = getState();
    if (completed.status === "active" && !hasUnsettledProOperation(completed)) {
      close();
    } else {
      setView("outcome");
    }
  }

  /** Restores independently of offers and reports ordinary failures only to the still-current caller. */
  async function restoreExplicitly() {
    if (closed.current || !isCurrentPresentation()) {
      return;
    }
    setView("outcome");
    try {
      await restoration.mutateAsync();
    } catch {
      if (!closed.current && isCurrentPresentation()) {
        feedback.error();
      }
    }
  }

  /** Removes the route once, even when native dismissal follows a completion callback. */
  const close = useCallback(() => {
    if (closed.current) {
      return false;
    }
    closed.current = true;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/profile");
    }
    return true;
  }, [router]);
  useEffect(() => {
    closed.current = false;
    return () => {
      closed.current = true;
    };
  }, []);
  useEffect(() => {
    if (admitted && current) {
      void refresh();
    }
  }, [admitted, current, refresh]);
  useEffect(() => {
    if (!admitted || !current) {
      close();
    }
  }, [admitted, current, close]);
  useEffect(() => {
    if (
      view === "outcome" &&
      state.status === "active" &&
      !hasUnsettledProOperation(state)
    ) {
      close();
    }
  }, [view, state, close]);
  if (!admitted || !current) {
    return null;
  }
  if (
    showPaywall &&
    offering.isFetchedAfterMount &&
    !offering.isFetching &&
    offering.data &&
    !offering.isError
  ) {
    return (
      <RevenueCatUI.Paywall
        style={styles.provider}
        options={{ offering: offering.data }}
        onRestoreStarted={startRestore}
        onRestoreCompleted={({ customerInfo }) => finishRestore(customerInfo)}
        onRestoreError={({ error }) => finishRestore(undefined, error)}
        onPurchasePackageInitiated={({ resume }) =>
          resume(
            !closed.current &&
              !paywallFinished.current &&
              isCurrentPresentation() &&
              canPurchasePro(getState()),
          )
        }
        onPurchaseCompleted={({ customerInfo }) => {
          if (paywallFinished.current || !isCurrentPresentation()) {
            return;
          }
          paywallFinished.current = true;
          void completeOperation("purchased", customerInfo);
          if (closed.current) {
            return;
          }
          const completed = getState();
          if (
            completed.status === "active" &&
            !hasUnsettledProOperation(completed)
          ) {
            close();
          } else {
            setView("outcome");
          }
        }}
        onPurchaseCancelled={() => {
          if (paywallFinished.current || !isCurrentPresentation()) {
            return;
          }
          paywallFinished.current = true;
          void completeOperation("cancelled");
          if (!closed.current) {
            close();
          }
        }}
        onPurchaseError={({ error }) => {
          if (paywallFinished.current || !isCurrentPresentation()) {
            return;
          }
          paywallFinished.current = true;
          const outcome = purchaseErrorOutcome(error.code);
          if (!closed.current && outcome === "failed") {
            feedback.error();
          }
          void completeOperation(outcome);
          if (closed.current) {
            return;
          }
          if (outcome === "failed" || outcome === "cancelled") {
            close();
          } else {
            setView("outcome");
          }
        }}
        onDismiss={() => {
          if (
            closed.current ||
            paywallFinished.current ||
            !isCurrentPresentation()
          ) {
            return;
          }
          close();
        }}
      />
    );
  }
  if (canPresentManagement(view, state)) {
    return (
      <RevenueCatUI.CustomerCenterView
        style={styles.provider}
        onRestoreStarted={() => {
          setView("management");
          startRestore();
        }}
        onRestoreCompleted={({ customerInfo }) => finishRestore(customerInfo)}
        onRestoreFailed={({ error }) => finishRestore(undefined, error)}
        onDismiss={() => {
          if (isCurrentPresentation()) {
            close();
          }
        }}
        onCustomActionSelected={
          onSupport
            ? ({ actionId }) => {
                if (
                  closed.current ||
                  !isCurrentPresentation() ||
                  actionId !==
                    Constants.expoConfig?.extra?.revenueCat
                      ?.supportActionIdentifier
                ) {
                  return;
                }
                if (!close()) {
                  return;
                }
                onSupport();
              }
            : undefined
        }
      />
    );
  }
  return (
    <ProRecovery
      showPaywall={showPaywall}
      offering={offering}
      restoring={restoration.isPending}
      onRetry={() => void retryOffering()}
      onRestore={restoreExplicitly}
      onManagement={() => {
        if (!closed.current && isCurrentPresentation()) {
          setView("management");
        }
      }}
      onSupport={
        onSupport
          ? () => {
              if (isCurrentPresentation() && close()) {
                onSupport();
              }
            }
          : undefined
      }
    />
  );
}

/** Native provider UI owns in-flight operations; current SDK rights admit its initial purchase presentation. */
function canPresentPaywall(
  view: "automatic" | "management" | "outcome",
  state: ProState,
) {
  if (view !== "automatic") {
    return false;
  }
  return canPurchasePro(state);
}

/** Explicit management and settled active rights share the SDK-owned Customer Center. */
function canPresentManagement(
  view: "automatic" | "management" | "outcome",
  state: ProState,
) {
  if (!hasAssociatedCustomer(state)) {
    return false;
  }
  return (
    view === "management" ||
    (view === "automatic" &&
      state.status === "active" &&
      !hasUnsettledProOperation(state))
  );
}

const styles = StyleSheet.create({
  provider: { flex: 1 },
});

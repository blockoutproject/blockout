import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import { useAccountSession } from "../../accounts/current-account";
import { usePro } from "../pro-provider";
import { canPurchasePro } from "../pro-offering";
import { purchaseErrorOutcome } from "../pro-operations";
import { useProOffering } from "../api/use-pro-offering";

/** F12 admission and explicit management intent; F10 supplies the real destination only when implemented. */
export interface ProPresentationScreenProps {
  admitted: boolean;
  management?: boolean;
  onSupport?: () => void;
}

/** Native-only full-screen host. Session removal dismisses presentation, never the underlying store transaction. */
export function ProPresentationScreen({
  admitted,
  management = false,
  onSupport,
}: ProPresentationScreenProps) {
  const account = useAccountSession();
  const router = useRouter();
  const {
    state,
    refresh,
    beginPurchase,
    completeOperation,
    dismissPresentation,
  } = usePro();
  const [openedFor] = useState(account.getSnapshot);
  const closed = useRef(false);
  /** Reads the live F05 snapshot, including a UUID change within an establishment generation. */
  function isCurrentPresentation() {
    return (
      account.isCurrent(openedFor.generation) &&
      account.getSnapshot().accountId === openedFor.accountId
    );
  }
  const current =
    account.status === "authenticated" &&
    openedFor.accountId !== null &&
    isCurrentPresentation();
  const associated =
    state.status === "active" ||
    state.status === "inactive" ||
    (state.status === "unavailable" && state.reason === "customer-info");
  const purchaseAllowed = canPurchasePro(state);
  const showPaywall =
    !management &&
    (purchaseAllowed ||
      (state.status !== "guest" && state.operation === "purchasing"));
  const offering = useProOffering();

  /** Removes the route once, even when native dismissal follows a completion callback. */
  const close = useCallback(() => {
    if (closed.current) return false;
    closed.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
    return true;
  }, [router]);

  useEffect(() => {
    if (admitted && current) void refresh();
    return () => {
      void dismissPresentation();
    };
  }, [admitted, current, refresh, dismissPresentation]);

  useEffect(() => {
    if (
      !admitted ||
      !current ||
      !associated ||
      (showPaywall && (!offering.data || offering.isError))
    ) {
      close();
    }
  }, [
    admitted,
    current,
    associated,
    showPaywall,
    offering.data,
    offering.isError,
    close,
  ]);

  if (!admitted || !current || !associated) return null;
  if (showPaywall) {
    if (!offering.data || offering.isError) return null;
    return (
      <RevenueCatUI.Paywall
        style={styles.provider}
        options={{ offering: offering.data }}
        onPurchasePackageInitiated={({ resume }) =>
          resume(!closed.current && isCurrentPresentation() && beginPurchase())
        }
        onPurchaseCompleted={({ customerInfo }) => {
          if (!isCurrentPresentation()) return;
          if (closed.current) {
            void refresh();
            return;
          }
          void completeOperation("purchased", customerInfo);
          close();
        }}
        onPurchaseCancelled={() => {
          if (closed.current || !isCurrentPresentation()) return;
          void completeOperation("cancelled");
          close();
        }}
        onPurchaseError={({ error }) => {
          if (closed.current || !isCurrentPresentation()) return;
          void completeOperation(purchaseErrorOutcome(error.code));
          close();
        }}
        onDismiss={() => {
          if (closed.current || !isCurrentPresentation()) return;
          void dismissPresentation();
          close();
        }}
      />
    );
  }
  return (
    <RevenueCatUI.CustomerCenterView
      style={styles.provider}
      onDismiss={() => {
        if (isCurrentPresentation()) close();
      }}
      onCustomActionSelected={
        onSupport
          ? ({ actionId }) => {
              if (
                !isCurrentPresentation() ||
                actionId !==
                  Constants.expoConfig?.extra?.revenueCat
                    ?.supportActionIdentifier
              )
                return;
              if (!close()) return;
              onSupport();
            }
          : undefined
      }
    />
  );
}

const styles = StyleSheet.create({ provider: { flex: 1 } });

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
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { Page, PageScrollView } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ScreenState } from "../../../shared/components/screen-state";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { RequestLoading } from "../../../shared/components/request-feedback";
import {
  hasUnsettledProOperation,
  ProVerification,
} from "../components/pro-verification";

/** F12 admission and explicit management intent; F10 supplies the real destination only when implemented. */
export interface ProPresentationScreenProps {
  admitted: boolean;
  management?: boolean;
  onSupport?: () => void;
}

/**
 * Owns Pro admission/recovery with unwrapped, session-scoped provider content.
 * Current native outcomes outlive route removal; its feedback and navigation do not.
 */
export function ProPresentationScreen({
  admitted,
  management = false,
  onSupport,
}: ProPresentationScreenProps) {
  const account = useAccountSession();
  const router = useRouter();
  const feedback = useActionFeedback({ retainOnUnmount: true });
  const {
    state,
    getState,
    refresh,
    beginPurchase,
    completeOperation,
    dismissPresentation,
  } = usePro();
  const [openedFor] = useState(account.getSnapshot);
  const [view, setView] = useState<"automatic" | "management" | "outcome">(
    management ? "management" : "automatic",
  );
  const closed = useRef(false);
  const paywallFinished = useRef(false);
  const offeringAttempt = useRef<symbol | null>(null);
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
    view === "automatic" &&
    (purchaseAllowed ||
      (state.status !== "guest" && state.operation === "purchasing"));
  const offering = useProOffering(admitted && current && showPaywall);
  const { refetch: readOffering } = offering;

  /** Retains a known empty catalogue on failure, but abandons its feedback when another destination view takes over. */
  async function retryOffering() {
    feedback.clear();
    const attempt = Symbol();
    offeringAttempt.current = attempt;
    const retainedEmpty = offering.data === null;
    try {
      const result = await readOffering();
      if (
        result.isError &&
        retainedEmpty &&
        offeringAttempt.current === attempt &&
        !closed.current &&
        isCurrentPresentation() &&
        canPurchasePro(getState())
      )
        feedback.error();
    } finally {
      if (offeringAttempt.current === attempt) offeringAttempt.current = null;
    }
  }

  /** Removes the route once, even when native dismissal follows a completion callback. */
  const close = useCallback(() => {
    if (closed.current) return false;
    offeringAttempt.current = null;
    closed.current = true;
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
    return true;
  }, [router]);

  useEffect(() => {
    closed.current = false;
    return () => {
      offeringAttempt.current = null;
      closed.current = true;
    };
  }, []);

  useEffect(() => {
    if (admitted && current) void refresh();
    return () => {
      void dismissPresentation();
    };
  }, [admitted, current, refresh, dismissPresentation]);

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
    )
      close();
  }, [view, state, close]);

  if (!admitted || !current) return null;
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
        onPurchasePackageInitiated={({ resume }) =>
          resume(
            !closed.current &&
              !paywallFinished.current &&
              isCurrentPresentation() &&
              beginPurchase(),
          )
        }
        onPurchaseCompleted={({ customerInfo }) => {
          if (paywallFinished.current || !isCurrentPresentation()) return;
          paywallFinished.current = true;
          void completeOperation("purchased", customerInfo);
          if (closed.current) return;
          const completed = getState();
          if (
            completed.status === "active" &&
            !hasUnsettledProOperation(completed)
          )
            close();
          else setView("outcome");
        }}
        onPurchaseCancelled={() => {
          if (paywallFinished.current || !isCurrentPresentation()) return;
          paywallFinished.current = true;
          void completeOperation("cancelled");
          if (!closed.current) close();
        }}
        onPurchaseError={({ error }) => {
          if (paywallFinished.current || !isCurrentPresentation()) return;
          paywallFinished.current = true;
          const outcome = purchaseErrorOutcome(error.code);
          if (!closed.current && outcome === "failed") feedback.error();
          void completeOperation(outcome);
          if (closed.current) return;
          if (outcome === "failed" || outcome === "cancelled") close();
          else setView("outcome");
        }}
        onDismiss={() => {
          if (
            closed.current ||
            paywallFinished.current ||
            !isCurrentPresentation()
          )
            return;
          void dismissPresentation();
          close();
        }}
      />
    );
  }
  if (
    associated &&
    (view === "management" ||
      (view === "automatic" &&
        state.status === "active" &&
        !hasUnsettledProOperation(state)))
  )
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
  return (
    <Page accessibilityViewIsModal>
      <PageHeader title="Blockout Pro" />
      <PageScrollView>
        <ScreenState>
          {showPaywall ? (
            !offering.isFetchedAfterMount ||
            (offering.isFetching && offering.data !== null) ? (
              <RequestLoading />
            ) : offering.isError && offering.data !== null ? (
              <ErrorState onRetry={() => void retryOffering()} />
            ) : (
              <>
                <EmptyState
                  title="Aucune offre Pro disponible"
                  description="Réessayez plus tard."
                />
                <Button
                  label="Réessayer"
                  onPress={() => void retryOffering()}
                  loading={offering.isFetching}
                />
              </>
            )
          ) : (
            <ProVerification />
          )}
          {associated && (
            <Button
              label="Gérer ou restaurer mes achats"
              onPress={() => {
                if (!closed.current && isCurrentPresentation()) {
                  offeringAttempt.current = null;
                  setView("management");
                }
              }}
            />
          )}
          {onSupport && (
            <Button
              label="Contacter l’assistance"
              onPress={() => {
                if (isCurrentPresentation() && close()) onSupport();
              }}
            />
          )}
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ provider: { flex: 1 } });

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
import { StyleSheet, Text } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import { useAccountSession } from "../../accounts/current-account";
import type { CustomerInfo } from "react-native-purchases";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { usePro } from "../pro-provider";
import { canPurchasePro } from "../pro-offering";
import {
  purchaseErrorOutcome,
  restoredProOperation,
  restoreErrorOutcome,
} from "../pro-operations";
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
/** F12 admission, explicit management intent and the existing F10 navigation destination. */
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
    beginRestore,
    restore,
    completeOperation,
    dismissPresentation,
  } = usePro();
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
  const { colors } = useTheme();
  const liveAccount = useRef(account);
  useLayoutEffect(() => {
    liveAccount.current = account;
  }, [account]);
  const closed = useRef(false);
  const restoreStarted = useRef(false);
  const paywallFinished = useRef(false);
  const offeringAttempt = useRef<symbol | null>(null);
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
  const associated =
    state.status === "active" ||
    state.status === "inactive" ||
    (state.status === "unavailable" && state.reason === "customer-info");
  const operation = state.status === "guest" ? "idle" : state.operation;
  const purchaseAllowed = canPurchasePro(state);
  const showPaywall =
    view === "automatic" &&
    (purchaseAllowed ||
      (state.status !== "guest" &&
        ["purchasing", "restoring"].includes(state.operation)));
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
  /** Observes a provider-owned explicit restoration; the native UI owns store execution. */
  function startRestore() {
    if (closed.current || !isCurrentPresentation()) return;
    restoreStarted.current = beginRestore();
  }
  /** Accepts one attributed native result without equating operation completion with active rights. */
  function finishRestore(customerInfo?: CustomerInfo, error?: unknown) {
    if (!restoreStarted.current || !isCurrentPresentation()) return;
    restoreStarted.current = false;
    const current = getState();
    if (current.status === "guest") return;
    void completeOperation(
      restoredProOperation(
        current.operation,
        customerInfo ? "restored" : restoreErrorOutcome(error),
      ),
      customerInfo,
    );
    if (closed.current) return;
    const completed = getState();
    if (completed.status === "active" && !hasUnsettledProOperation(completed))
      close();
    else setView("outcome");
  }
  /** The fallback remains independent of offers; the existing owner gates native execution. */
  function restoreExplicitly() {
    if (closed.current || !isCurrentPresentation()) return;
    offeringAttempt.current = null;
    setView("outcome");
    restoration.mutate();
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
        onRestoreStarted={startRestore}
        onRestoreCompleted={({ customerInfo }) => finishRestore(customerInfo)}
        onRestoreError={({ error }) => finishRestore(undefined, error)}
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
        onRestoreStarted={() => {
          setView("management");
          startRestore();
        }}
        onRestoreCompleted={({ customerInfo }) => finishRestore(customerInfo)}
        onRestoreFailed={({ error }) => finishRestore(undefined, error)}
        onDismiss={() => {
          if (isCurrentPresentation()) close();
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
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            La restauration peut associer les achats du store à ce compte, y
            compris le reçu entier. Elle ne récupère ni votre ancien profil ni
            vos cadeaux. Un achat d’une autre boutique peut nécessiter
            l’assistance.
          </Text>
          <Button
            label="Restaurer mes achats"
            onPress={restoreExplicitly}
            disabled={
              !associated || ["restoring", "purchasing"].includes(operation)
            }
            loading={restoration.isPending || operation === "restoring"}
          />
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

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import { useSessionState } from "@/src/modules/session/providers/session-context";
import {
  mapRevenueCatError,
  reportRevenueCatFailure,
  type RevenueCatConfiguration,
  type RevenueCatFailureCode,
  type RevenueCatOperation,
} from "@/src/modules/subscription/providers/revenuecat-client";

export type PurchasesStatus =
  "unconfigured" | "configuring" | "ready" | "stale-cache" | "degraded";

export type SubscriptionCommandResult =
  | {
      outcome:
        "cancelled" | "not-presented" | "purchased" | "refreshed" | "restored";
    }
  | {
      outcome: "error";
      errorCode: RevenueCatFailureCode;
    };

export type PurchasesContextValue = {
  isPro: boolean;
  isReady: boolean;
  isHydrated: boolean;
  status: PurchasesStatus;
  errorCode: RevenueCatFailureCode | null;
  customerInfo: CustomerInfo | null;
  refresh: () => Promise<SubscriptionCommandResult>;
  presentPaywall: () => Promise<SubscriptionCommandResult>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

/**
 * Exposes the current subscription state and commands owned by RevenueCat.
 */
export function usePurchases() {
  const ctx = useContext(PurchasesContext);
  if (!ctx)
    throw new Error("usePurchases must be used within <PurchasesProvider>");
  return ctx;
}

type PurchasesProviderProps = React.PropsWithChildren<{
  configuration: RevenueCatConfiguration;
}>;

type CustomerInfoResult =
  { customerInfo: CustomerInfo } | { errorCode: RevenueCatFailureCode };

/**
 * Owns RevenueCat identity, CustomerInfo, listener, refresh, and paywall state.
 */
export function PurchasesProvider({
  children,
  configuration,
}: PurchasesProviderProps) {
  const { isAuthenticated, auth0User, isBootstrapped } = useSessionState();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [status, setStatus] = useState<PurchasesStatus>(
    configuration.status === "configured"
      ? "configuring"
      : configuration.status,
  );
  const [errorCode, setErrorCode] = useState<RevenueCatFailureCode | null>(
    configuration.status === "configured" ? null : configuration.errorCode,
  );

  const mountedRef = useRef(false);
  const customerInfoRef = useRef<CustomerInfo | null>(null);
  const identityRevisionRef = useRef(0);
  const identityQueueRef = useRef<Promise<void>>(Promise.resolve());
  const desiredIdentityRef = useRef<string | null>(null);
  const isIdentityTransitioningRef = useRef(false);

  const entitlementId =
    configuration.status === "configured" ? configuration.entitlementId : null;
  const isPro = isEntitled(customerInfo, entitlementId);
  const isReady = status === "ready" || status === "stale-cache";
  const isHydrated = status !== "configuring";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      identityRevisionRef.current += 1;
    };
  }, []);

  const applyCustomerInfo = useCallback(
    (info: CustomerInfo, revision: number) => {
      if (!mountedRef.current || identityRevisionRef.current !== revision) {
        return false;
      }

      customerInfoRef.current = info;
      setCustomerInfo(info);
      setStatus("ready");
      setErrorCode(null);
      return true;
    },
    [],
  );

  const readCustomerInfo = useCallback(
    async (
      revision: number,
      operation: RevenueCatOperation,
      shouldReportFailure: boolean,
    ): Promise<CustomerInfoResult> => {
      const startedAt = Date.now();

      try {
        const info = await Purchases.getCustomerInfo();
        applyCustomerInfo(info, revision);
        return { customerInfo: info };
      } catch (error) {
        const code = mapRevenueCatError(error);

        if (mountedRef.current && identityRevisionRef.current === revision) {
          setStatus(customerInfoRef.current ? "stale-cache" : "degraded");
          setErrorCode(code);
        }

        if (shouldReportFailure) {
          reportRevenueCatFailure({
            operation,
            code,
            identified:
              desiredIdentityRef.current?.startsWith("identified:") === true,
            startedAt,
          });
        }

        return { errorCode: code };
      }
    },
    [applyCustomerInfo],
  );

  useEffect(() => {
    if (configuration.status !== "configured" || !isBootstrapped) return;

    const auth0Id = auth0User?.sub?.trim() ?? "";
    const desiredIdentity =
      isAuthenticated && auth0Id ? `identified:${auth0Id}` : "anonymous";

    if (desiredIdentityRef.current === desiredIdentity) return;

    desiredIdentityRef.current = desiredIdentity;
    const revision = identityRevisionRef.current + 1;
    identityRevisionRef.current = revision;
    isIdentityTransitioningRef.current = true;
    customerInfoRef.current = null;
    setCustomerInfo(null);
    setStatus("configuring");
    setErrorCode(null);

    const synchronizeIdentity = async () => {
      if (!mountedRef.current || identityRevisionRef.current !== revision) {
        return;
      }

      const startedAt = Date.now();

      try {
        const info =
          desiredIdentity === "anonymous"
            ? await loadAnonymousCustomerInfo()
            : (await Purchases.logIn(auth0Id)).customerInfo;
        applyCustomerInfo(info, revision);
      } catch (error) {
        const code = mapRevenueCatError(error);

        if (mountedRef.current && identityRevisionRef.current === revision) {
          setStatus("degraded");
          setErrorCode(code);
        }

        reportRevenueCatFailure({
          operation: "identity",
          code,
          identified: desiredIdentity !== "anonymous",
          startedAt,
        });
      } finally {
        if (identityRevisionRef.current === revision) {
          isIdentityTransitioningRef.current = false;
        }
      }
    };

    const queuedIdentity = identityQueueRef.current
      .catch(() => undefined)
      .then(synchronizeIdentity);
    identityQueueRef.current = queuedIdentity.catch(() => undefined);
  }, [
    auth0User?.sub,
    applyCustomerInfo,
    configuration.status,
    isAuthenticated,
    isBootstrapped,
  ]);

  useEffect(() => {
    if (configuration.status !== "configured") return;

    const listener = (_info: CustomerInfo) => {
      if (!desiredIdentityRef.current || isIdentityTransitioningRef.current) {
        return;
      }

      const revision = identityRevisionRef.current;
      void readCustomerInfo(revision, "listener", true);
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [configuration.status, readCustomerInfo]);

  const refresh = useCallback(async () => {
    if (configuration.status !== "configured") {
      return {
        outcome: "error",
        errorCode: configuration.errorCode,
      } satisfies SubscriptionCommandResult;
    }

    if (!desiredIdentityRef.current || isIdentityTransitioningRef.current) {
      return {
        outcome: "error",
        errorCode: "operation-in-progress",
      } satisfies SubscriptionCommandResult;
    }

    const result = await readCustomerInfo(
      identityRevisionRef.current,
      "customer-info",
      true,
    );
    return "customerInfo" in result
      ? ({ outcome: "refreshed" } satisfies SubscriptionCommandResult)
      : ({
          outcome: "error",
          errorCode: result.errorCode,
        } satisfies SubscriptionCommandResult);
  }, [configuration, readCustomerInfo]);

  const presentPaywall =
    useCallback(async (): Promise<SubscriptionCommandResult> => {
      if (configuration.status !== "configured") {
        showSubscriptionFailure(configuration.errorCode);
        return {
          outcome: "error",
          errorCode: configuration.errorCode,
        } satisfies SubscriptionCommandResult;
      }

      if (!desiredIdentityRef.current || isIdentityTransitioningRef.current) {
        showSubscriptionFailure("operation-in-progress");
        return {
          outcome: "error",
          errorCode: "operation-in-progress",
        } satisfies SubscriptionCommandResult;
      }

      const startedAt = Date.now();

      try {
        const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: configuration.entitlementId,
        });

        switch (paywallResult) {
          case PAYWALL_RESULT.CANCELLED:
            return { outcome: "cancelled" };
          case PAYWALL_RESULT.NOT_PRESENTED:
            return { outcome: "not-presented" };
          case PAYWALL_RESULT.ERROR:
            reportRevenueCatFailure({
              operation: "paywall",
              code: "unknown",
              identified:
                desiredIdentityRef.current?.startsWith("identified:") === true,
              startedAt,
            });
            showSubscriptionFailure("unknown");
            return { outcome: "error", errorCode: "unknown" };
          case PAYWALL_RESULT.PURCHASED:
          case PAYWALL_RESULT.RESTORED: {
            const refreshed = await readCustomerInfo(
              identityRevisionRef.current,
              "customer-info",
              false,
            );

            if ("errorCode" in refreshed) {
              showSubscriptionFailure(refreshed.errorCode);
              return {
                outcome: "error",
                errorCode: refreshed.errorCode,
              };
            }

            if (
              !isEntitled(refreshed.customerInfo, configuration.entitlementId)
            ) {
              showSubscriptionFailure("no-entitlement");
              return {
                outcome: "error",
                errorCode: "no-entitlement",
              };
            }

            if (paywallResult === PAYWALL_RESULT.RESTORED) {
              Alert.alert(
                "Achats restaurés",
                "Ton abonnement Blockout Pro est de nouveau actif.",
              );
              return { outcome: "restored" };
            }

            return { outcome: "purchased" };
          }
        }
      } catch (error) {
        const code = mapRevenueCatError(error);
        reportRevenueCatFailure({
          operation: "paywall",
          code,
          identified:
            desiredIdentityRef.current?.startsWith("identified:") === true,
          startedAt,
        });
        showSubscriptionFailure(code);
        return { outcome: "error", errorCode: code };
      }
    }, [configuration, readCustomerInfo]);

  const value = useMemo<PurchasesContextValue>(
    () => ({
      isPro,
      isReady,
      isHydrated,
      status,
      errorCode,
      customerInfo,
      refresh,
      presentPaywall,
    }),
    [
      customerInfo,
      errorCode,
      isHydrated,
      isPro,
      isReady,
      presentPaywall,
      refresh,
      status,
    ],
  );

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}

/**
 * Loads the anonymous customer without creating another anonymous identity.
 */
async function loadAnonymousCustomerInfo() {
  return (await Purchases.isAnonymous())
    ? Purchases.getCustomerInfo()
    : Purchases.logOut();
}

/**
 * Checks the configured entitlement directly in canonical CustomerInfo.
 */
function isEntitled(info: CustomerInfo | null, entitlementId: string | null) {
  return Boolean(entitlementId && info?.entitlements.active[entitlementId]);
}

/**
 * Presents one actionable message for a stable subscription failure.
 */
function showSubscriptionFailure(code: RevenueCatFailureCode) {
  const message = {
    configuration:
      "Les achats ne sont pas disponibles dans cette version de l’application.",
    identity:
      "Impossible de vérifier l’abonnement pour ce compte. Reconnecte-toi puis réessaie.",
    network:
      "Vérifie ta connexion internet, puis réessaie de vérifier ton abonnement.",
    "no-entitlement":
      "Aucun abonnement Blockout Pro actif n’a été trouvé pour ce compte.",
    "operation-in-progress":
      "Une vérification d’abonnement est déjà en cours. Réessaie dans un instant.",
    pending: "Ton achat est en attente de confirmation par le store.",
    store:
      "Le store n’a pas pu traiter cette demande. Vérifie ton compte de paiement puis réessaie.",
    unknown:
      "Une erreur inattendue empêche la vérification de l’abonnement. Réessaie plus tard.",
  }[code];

  Alert.alert("Blockout Pro", message);
}

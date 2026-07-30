import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Linking, Platform, StatusBar } from "react-native";

import {
  initializeAdvertisingOnce,
  showAdvertisingPrivacyOptions,
  type AdvertisingBootstrapResult,
} from "@/src/modules/advertising/api/advertising-client";
import {
  mapAdvertisingError,
  reportAdvertisingFailure,
  type AdvertisingPlacement,
} from "@/src/modules/advertising/api/advertising-diagnostics";
import { InterstitialController } from "@/src/modules/advertising/api/interstitial-controller";
import { ADS } from "@/src/modules/advertising/config/ads";
import { usePurchases } from "@/src/modules/subscription/providers/purchases-provider";

type AdvertisingContextValue = {
  status: "failed" | "initializing" | "partial" | "ready" | "unavailable";
  privacyOptionsRequired: boolean;
  handleNavigationWithAd: (navigate: () => Promise<void> | void) => void;
  openLinkWithInterstitial: (url: string) => void;
  showPrivacyOptions: () => Promise<void>;
};

const AdvertisingContext = createContext<AdvertisingContextValue | null>(null);

const INITIAL_STATE: AdvertisingBootstrapResult = {
  status: "unavailable",
  consentEvidence: "unavailable",
  canRequestAds: false,
  privacyOptionsRequired: false,
  adapterReadiness: [],
  errorCode: null,
};

/** Applies the full-screen status-bar behavior required only on iOS. */
function setFullscreenUiHidden(hidden: boolean) {
  if (Platform.OS === "ios") StatusBar.setHidden(hidden);
}

/** Executes a bypassed action through the same safe provider boundary. */
function runActionWithoutAd(
  placement: AdvertisingPlacement,
  action: () => Promise<void> | void,
) {
  void Promise.resolve()
    .then(action)
    .catch((error) => {
      reportAdvertisingFailure({
        operation: "user-action",
        placement,
        outcome: "failed",
        errorCode: mapAdvertisingError(error, "user-action-failed"),
      });
    });
}

/** Exposes the application-scoped advertising commands and privacy state. */
export function useAdvertising() {
  const context = useContext(AdvertisingContext);
  if (!context) {
    throw new Error("useAdvertising must be used within <AdvertisingProvider>");
  }
  return context;
}

/**
 * Owns UMP, ATT, Google Mobile Ads initialization, premium suppression, and
 * both accepted interstitial placements for the application lifecycle.
 */
export function AdvertisingProvider({ children }: React.PropsWithChildren) {
  const { isHydrated, isPro } = usePurchases();
  const [bootstrap, setBootstrap] =
    useState<AdvertisingBootstrapResult>(INITIAL_STATE);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigationControllerRef = useRef<InterstitialController | null>(null);
  const externalLinkControllerRef = useRef<InterstitialController | null>(null);

  useEffect(() => {
    let mounted = true;

    void initializeAdvertisingOnce().then((result) => {
      if (!mounted) return;
      setBootstrap(result);
      setIsInitializing(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const advertisingReady =
    bootstrap.canRequestAds &&
    (bootstrap.status === "ready" || bootstrap.status === "partial");

  useEffect(() => {
    if (!advertisingReady || !isHydrated || isPro) {
      navigationControllerRef.current?.dispose();
      externalLinkControllerRef.current?.dispose();
      navigationControllerRef.current = null;
      externalLinkControllerRef.current = null;
      return;
    }

    const navigationController = new InterstitialController({
      placement: "navigation",
      adUnitId: ADS.INTERSTITIAL_NAV,
      actionsBetweenAds: 10,
      setFullscreenUiHidden,
    });
    const externalLinkController = new InterstitialController({
      placement: "external-link",
      adUnitId: ADS.INTERSTITIAL_WEB,
      actionsBetweenAds: 1,
      setFullscreenUiHidden,
    });

    navigationControllerRef.current = navigationController;
    externalLinkControllerRef.current = externalLinkController;
    navigationController.start();
    externalLinkController.start();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState !== "active") return;
        navigationController.onForeground();
        externalLinkController.onForeground();
      },
    );

    return () => {
      appStateSubscription.remove();
      navigationController.dispose();
      externalLinkController.dispose();
      navigationControllerRef.current = null;
      externalLinkControllerRef.current = null;
    };
  }, [advertisingReady, isHydrated, isPro]);

  const handleNavigationWithAd = useCallback(
    (navigate: () => Promise<void> | void) => {
      const controller = navigationControllerRef.current;
      if (!controller || isPro || !isHydrated) {
        runActionWithoutAd("navigation", navigate);
        return;
      }
      controller.run(navigate);
    },
    [isHydrated, isPro],
  );

  const openLinkWithInterstitial = useCallback(
    (url: string) => {
      const openUrl = () => Linking.openURL(url);
      const controller = externalLinkControllerRef.current;
      if (!controller || isPro || !isHydrated) {
        runActionWithoutAd("external-link", openUrl);
        return;
      }
      controller.run(openUrl);
    },
    [isHydrated, isPro],
  );

  const showPrivacyOptions = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const result = await showAdvertisingPrivacyOptions();
      setBootstrap(result);
    } catch (error) {
      reportAdvertisingFailure({
        operation: "privacy-options",
        outcome: "failed",
        errorCode: mapAdvertisingError(error, "privacy-options-failed"),
        durationMs: Date.now() - startedAt,
      });
    }
  }, []);

  const value = useMemo<AdvertisingContextValue>(
    () => ({
      status: isInitializing ? "initializing" : bootstrap.status,
      privacyOptionsRequired: bootstrap.privacyOptionsRequired,
      handleNavigationWithAd,
      openLinkWithInterstitial,
      showPrivacyOptions,
    }),
    [
      bootstrap.privacyOptionsRequired,
      bootstrap.status,
      handleNavigationWithAd,
      isInitializing,
      openLinkWithInterstitial,
      showPrivacyOptions,
    ],
  );

  return (
    <AdvertisingContext.Provider value={value}>
      {children}
    </AdvertisingContext.Provider>
  );
}

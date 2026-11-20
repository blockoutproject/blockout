import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import Constants from "expo-constants";
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
} from "react-native-google-mobile-ads";
import { getTrackingPermissionsAsync } from "expo-tracking-transparency";
import { setAdvertiserTrackingEnabled } from "@react-native-google-mobile-ads/facebook";
import type { SessionSnapshot } from "@/features/accounts";
import { createInterstitialLifecycle } from "./interstitial-lifecycle";

interface AdvertisingContext extends SessionSnapshot {
  ordinary: boolean;
  isFree(): boolean;
}

type AdvertisingSnapshot = {
  privacyOptionsRequired: boolean;
  privacyOptionsPending: boolean;
};

/** UMP owns installation consent; only live admission and entitlements can use it for an ad. */
export function createAdvertisingPrivacy(configuration?: {
  adUnitId?: string;
}) {
  const adUnitId = configuration?.adUnitId;
  let context: AdvertisingContext | null = null;
  let session = 0;
  let consent: AdsConsentInfo | null = null;
  let consentStep: "update" | "form" | "complete" = "update";
  let sdk: "idle" | "initializing" | "ready" = "idle";
  let disposed = false;
  let snapshot: AdvertisingSnapshot = {
    privacyOptionsRequired: false,
    privacyOptionsPending: false,
  };
  const listeners = new Set<() => void>();
  const isFree = () => context?.ordinary === true && context.isFree();
  const canRequestAds = () =>
    !snapshot.privacyOptionsPending && consent?.canRequestAds === true;
  const interstitial = createInterstitialLifecycle({
    adUnitId,
    isFree,
    canLoad: () => sdk === "ready" && canRequestAds(),
  });

  function publish(pending: boolean) {
    if (disposed) {
      return;
    }
    snapshot = {
      privacyOptionsRequired:
        consent?.privacyOptionsRequirementStatus ===
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      privacyOptionsPending: pending,
    };
    listeners.forEach((listener) => listener());
  }

  async function readLastConsent() {
    try {
      consent = await AdsConsent.getConsentInfo();
    } catch {
      if (consent) {
        consent = { ...consent, canRequestAds: false };
      }
    }
  }

  async function prepareAds() {
    if (!adUnitId || sdk === "initializing" || !isFree() || !canRequestAds()) {
      return;
    }
    if (sdk === "idle") {
      sdk = "initializing";
      try {
        // UMP owns the IDFA prompt. On iOS 16, Meta needs the system result explicitly.
        if (
          Platform.OS === "ios" &&
          Number.parseInt(String(Platform.Version), 10) < 17
        ) {
          const { status } = await getTrackingPermissionsAsync();
          if (!isFree() || !canRequestAds()) {
            return;
          }
          setAdvertiserTrackingEnabled(status === "granted");
        }
        await mobileAds().initialize();
        sdk = "ready";
      } catch {
        Sentry.captureException(new Error("Mobile Ads initialization failed"));
      } finally {
        if (sdk === "initializing") {
          sdk = "idle";
        }
      }
    }
    interstitial.preload();
  }

  async function synchronize() {
    if (
      !configuration ||
      disposed ||
      !context?.ordinary ||
      snapshot.privacyOptionsPending
    ) {
      return;
    }
    if (
      consentStep === "update" ||
      (consentStep === "form" && adUnitId && isFree())
    ) {
      publish(true);
      try {
        if (consentStep === "update") {
          consent = await AdsConsent.requestInfoUpdate();
          consentStep = "form";
        }
        if (adUnitId && isFree()) {
          consent = await AdsConsent.loadAndShowConsentFormIfRequired();
          consentStep = "complete";
        }
      } catch {
        Sentry.captureException(
          new Error(
            consentStep === "update"
              ? "Advertising consent update failed"
              : "Advertising consent form failed",
          ),
        );
        consentStep = "complete";
        // UMP can still authorize ads using permission from a prior launch.
        await readLastConsent();
      } finally {
        publish(false);
      }
    }
    await prepareAds();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setContext(next: AdvertisingContext | null) {
      const scopeChanged =
        next?.subject !== context?.subject ||
        next?.accountId !== context?.accountId ||
        next?.ordinary !== context?.ordinary;
      context = next;
      if (scopeChanged) {
        session++;
      }
      if (scopeChanged || !isFree()) {
        interstitial.invalidate();
      }
    },
    synchronize,
    async showPrivacyOptions() {
      if (
        disposed ||
        !context?.ordinary ||
        snapshot.privacyOptionsPending ||
        !snapshot.privacyOptionsRequired
      ) {
        return;
      }
      publish(true);
      interstitial.invalidate();
      try {
        consent = await AdsConsent.showPrivacyOptionsForm();
      } catch {
        await readLastConsent();
        throw new Error("Advertising privacy options failed");
      } finally {
        publish(false);
        void prepareAds();
      }
    },
    openSportingDestination(open: () => void, isCurrent: () => boolean) {
      const origin = session;
      interstitial.openDestination(
        open,
        () => !disposed && session === origin && isCurrent(),
      );
    },
    dispose() {
      disposed = true;
      context = null;
      interstitial.dispose();
      listeners.clear();
    },
  };
}

/** Shares the consent refresh and counter for the lifetime of the application root. */
export function createInstallationAdvertisingPrivacy() {
  const advertising = Constants.expoConfig?.extra?.advertising;
  return createAdvertisingPrivacy(advertising?.[Platform.OS]);
}

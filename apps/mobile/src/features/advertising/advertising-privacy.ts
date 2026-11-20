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
export function createAdvertisingPrivacy({ adUnitId }: { adUnitId?: string }) {
  let context: AdvertisingContext | null = null;
  let session = 0;
  let consent: AdsConsentInfo | null = null;
  let updated = false;
  let formAttempted = false;
  let initialized = false;
  let initializing = false;
  let disposed = false;
  let snapshot: AdvertisingSnapshot = {
    privacyOptionsRequired: false,
    privacyOptionsPending: false,
  };
  const listeners = new Set<() => void>();
  const unit = adUnitId?.trim();
  const isFree = () => context?.ordinary === true && context.isFree();
  const canRequestAds = () =>
    !snapshot.privacyOptionsPending && consent?.canRequestAds === true;
  const interstitial = createInterstitialLifecycle({
    adUnitId: unit,
    isFree,
    canLoad: () => initialized && canRequestAds(),
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
    if (!unit || initializing || !isFree() || !canRequestAds()) {
      return;
    }
    if (initialized) {
      interstitial.preload();
      return;
    }
    initializing = true;
    try {
      // UMP owns the IDFA prompt. Older Meta adapters need the actual system result.
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
      initialized = true;
    } catch {
      Sentry.captureException(new Error("Mobile Ads initialization failed"));
    } finally {
      initializing = false;
    }
    interstitial.preload();
  }

  async function synchronize() {
    if (disposed || !context?.ordinary || snapshot.privacyOptionsPending) {
      return;
    }
    if (!updated || (unit && isFree() && !formAttempted)) {
      publish(true);
      try {
        if (!updated) {
          updated = true;
          try {
            consent = await AdsConsent.requestInfoUpdate();
          } catch {
            // UMP may still authorize requests based on an earlier session.
            formAttempted = true;
            await readLastConsent();
            Sentry.captureException(
              new Error("Advertising consent update failed"),
            );
          }
        }
        if (unit && isFree() && !formAttempted) {
          formAttempted = true;
          try {
            consent = await AdsConsent.loadAndShowConsentFormIfRequired();
          } catch {
            await readLastConsent();
            Sentry.captureException(
              new Error("Advertising consent form failed"),
            );
          }
        }
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
      if (
        next?.subject !== context?.subject ||
        next?.accountId !== context?.accountId ||
        next?.ordinary !== context?.ordinary
      ) {
        session++;
        interstitial.invalidate();
      }
      context = next;
      if (!isFree()) {
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
      }
      void prepareAds();
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
  return createAdvertisingPrivacy({
    adUnitId:
      Platform.OS === "ios"
        ? advertising?.iosInterstitialUnitId
        : advertising?.androidInterstitialUnitId,
  });
}

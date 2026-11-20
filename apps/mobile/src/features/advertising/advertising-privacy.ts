import { Platform } from "react-native";
import Constants from "expo-constants";
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  AgeRestrictedTreatment,
  MaxAdContentRating,
  type AdsConsentInfo,
} from "react-native-google-mobile-ads";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { setAdvertiserTrackingEnabled } from "@react-native-google-mobile-ads/facebook";
import type { AccountSession } from "@/features/accounts";
import {
  isAdvertisingEligible,
  type AdvertisingEligibilityInput,
} from "./advertising-eligibility";
import { createInterstitialLifecycle } from "./interstitial-lifecycle";

/** Read the installed age treatment and current account, admission and RevenueCat owners at use. */
export interface AdvertisingPrivacyContext extends AdvertisingEligibilityInput {
  account: Pick<AccountSession, "subject" | "accountId">;
}

export interface AdvertisingPrivacySnapshot {
  privacyOptionsRequired: boolean;
  pending: boolean;
}

interface AdvertisingPrivacyOptions {
  getContext(): AdvertisingPrivacyContext;
  adUnitId?: string;
}

function optionsRequired(info: AdsConsentInfo) {
  return (
    info.privacyOptionsRequirementStatus ===
    AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
  );
}

function requestConfiguration(
  category: NonNullable<AdvertisingPrivacyContext["category"]>,
) {
  const ageRestrictedTreatment = {
    under16: AgeRestrictedTreatment.CHILD,
    "16–17": AgeRestrictedTreatment.TEEN,
    adult: AgeRestrictedTreatment.UNSPECIFIED,
  }[category];
  return {
    ageRestrictedTreatment,
    maxAdContentRating:
      category === "under16" ? MaxAdContentRating.G : MaxAdContentRating.T,
  };
}

/**
 * Owns launch and explicit privacy operations. UMP supplies request authorization and AdMob
 * applies the native consent signals. RevenueCat only gates ad preparation and presentation.
 */
export function createAdvertisingPrivacy({
  getContext: initialContext,
  adUnitId,
}: AdvertisingPrivacyOptions) {
  let getContext = initialContext;
  let snapshot: AdvertisingPrivacySnapshot = {
    privacyOptionsRequired: false,
    pending: false,
  };
  let launch: {
    category: NonNullable<AdvertisingPrivacyContext["category"]>;
    stage: "attempted" | "form-deferred" | "refreshed";
  } | null = null;
  let canRequestAds = false;
  let adsReady = false;
  let initialization: Promise<boolean> | undefined;
  let trackingRequested = false;
  let disposed = false;
  const listeners = new Set<() => void>();
  const interstitial = adUnitId
    ? createInterstitialLifecycle({
        adUnitId,
        isEligibleOpening: () => isAdvertisingEligible(getContext()),
        canRequestAds: () => adsReady && isAdvertisingEligible(getContext()),
      })
    : undefined;

  function publish(next: AdvertisingPrivacySnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function invalidateConsent() {
    canRequestAds = false;
    adsReady = false;
    interstitial?.invalidate();
  }

  /**
   * Apple requires respecting a refusal in the applicable consent form before offering ATT.
   * Read SDK choices solely for that prompt. Meta iOS 16 needs the legacy flag; newer iOS
   * versions read the system authorization.
   */
  async function prepareTracking(current: () => boolean) {
    if (Platform.OS !== "ios") {
      return;
    }
    const legacy = Number.parseInt(String(Platform.Version), 10) < 17;
    let allowed = false;
    try {
      if (getContext().category !== "adult") {
        return;
      }
      let permission = await getTrackingPermissionsAsync();
      if (!current()) {
        return;
      }
      const mayPrompt =
        permission.status === "undetermined" &&
        permission.canAskAgain &&
        !trackingRequested;
      if (!mayPrompt && !(legacy && permission.status === "granted")) {
        return;
      }

      const choices = await AdsConsent.getUserChoices();
      if (
        !current() ||
        !choices.storeAndAccessInformationOnDevice ||
        !choices.createAPersonalisedAdsProfile ||
        !choices.selectPersonalisedAds ||
        !choices.selectBasicAds
      ) {
        return;
      }
      if (mayPrompt) {
        trackingRequested = true;
        permission = await requestTrackingPermissionsAsync();
      }
      allowed = permission.status === "granted";
    } finally {
      if (legacy && current()) {
        setAdvertiserTrackingEnabled(allowed);
      }
    }
  }

  function run(action: () => Promise<void>) {
    publish({ ...snapshot, pending: true });
    return action().finally(() => {
      if (!disposed) {
        publish({ ...snapshot, pending: false });
      }
    });
  }

  function establishConsent(action: "automatic" | "options") {
    const { category } = getContext();
    if (category === null) {
      return;
    }
    invalidateConsent();
    if (!launch || launch.category !== category) {
      launch = { category, stage: "attempted" };
    }
    const attempt = launch;
    const current = () =>
      !disposed &&
      launch === attempt &&
      (getContext().category === null || getContext().category === category);
    return run(async () => {
      try {
        if (attempt.stage === "attempted") {
          await mobileAds().setRequestConfiguration(
            requestConfiguration(category),
          );
          if (!current()) {
            return;
          }
          const info = await AdsConsent.requestInfoUpdate({
            tagForUnderAgeOfConsent: category === "under16",
          });
          if (!current()) {
            return;
          }
          attempt.stage = "refreshed";
          publish({
            ...snapshot,
            privacyOptionsRequired: optionsRequired(info),
          });
        }

        const { admission, pro } = getContext();
        if (
          action !== "options" &&
          (!admission.ordinary || pro.status === "active")
        ) {
          attempt.stage = "form-deferred";
          return;
        }
        let info: AdsConsentInfo;
        if (action === "options") {
          info = await AdsConsent.getConsentInfo();
          if (!current() || !getContext().admission.ordinary) {
            return;
          }
          if (optionsRequired(info)) {
            await AdsConsent.showPrivacyOptionsForm();
            info = await AdsConsent.getConsentInfo();
            attempt.stage = "refreshed";
          }
        } else {
          attempt.stage = "refreshed";
          info = await AdsConsent.loadAndShowConsentFormIfRequired();
        }
        if (current()) {
          canRequestAds = info.canRequestAds;
          publish({
            ...snapshot,
            privacyOptionsRequired: optionsRequired(info),
          });
        }
      } catch {
        if (action === "options") {
          throw new Error("Advertising choices could not be established");
        }
      }
    });
  }

  return {
    getSnapshot: () => snapshot,
    /** Rebinds live React owners after commit. */
    setContext(read: AdvertisingPrivacyOptions["getContext"]) {
      getContext = read;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** A corrected declaration must establish its treatment before requesting another ad. */
    suspend() {
      launch = null;
      invalidateConsent();
      publish({ ...snapshot, privacyOptionsRequired: false });
    },
    invalidateAd() {
      interstitial?.invalidate();
    },
    refreshOptions() {
      if (disposed || snapshot.pending || !getContext().admission.ordinary) {
        return;
      }
      return run(async () => {
        const info = await AdsConsent.getConsentInfo().catch(() => undefined);
        if (!disposed) {
          publish({
            ...snapshot,
            privacyOptionsRequired: !!info && optionsRequired(info),
          });
        }
      });
    },
    showOptions() {
      if (
        disposed ||
        snapshot.pending ||
        !snapshot.privacyOptionsRequired ||
        !getContext().admission.ordinary
      ) {
        return;
      }
      return establishConsent("options");
    },
    synchronize() {
      const { category, admission, pro } = getContext();
      if (
        disposed ||
        snapshot.pending ||
        !admission.ordinary ||
        category === null
      ) {
        return;
      }
      if (
        category !== launch?.category ||
        (launch.stage === "form-deferred" && pro.status !== "active")
      ) {
        return establishConsent("automatic");
      }
      if (
        !interstitial ||
        !canRequestAds ||
        !isAdvertisingEligible(getContext())
      ) {
        return;
      }
      if (adsReady) {
        interstitial.preload();
        return;
      }
      const current = () =>
        !disposed &&
        getContext().category === category &&
        canRequestAds &&
        isAdvertisingEligible(getContext());
      return run(async () => {
        try {
          await prepareTracking(current);
          if (!current()) {
            return;
          }
          initialization ??= mobileAds()
            .initialize()
            .then(
              () => true,
              () => false,
            );
          if (!(await initialization)) {
            canRequestAds = false;
            return;
          }
        } catch {
          canRequestAds = false;
          return;
        }
        if (current()) {
          adsReady = true;
          interstitial.preload();
        }
      });
    },
    /** Retains only the originating account of a native presentation across its dismissal. */
    openSportingDetail(canPresent: boolean, open: () => void) {
      if (!interstitial) {
        open();
        return;
      }
      const { account } = getContext();
      interstitial.open(canPresent, () => {
        const current = getContext().account;
        if (
          current.subject === account.subject &&
          current.accountId === account.accountId
        ) {
          open();
        }
      });
    },
    dispose() {
      disposed = true;
      interstitial?.dispose();
      listeners.clear();
    },
  };
}

/** Allocates the installation-wide SDK owner, closed until React supplies current eligibility. */
export function createInstallationAdvertisingPrivacy() {
  return createAdvertisingPrivacy({
    adUnitId:
      Platform.OS === "ios"
        ? Constants.expoConfig?.extra?.advertising?.iosInterstitialUnitId
        : Constants.expoConfig?.extra?.advertising?.androidInterstitialUnitId,
    getContext: () => ({
      account: { subject: null, accountId: null },
      pro: { status: "guest" },
      admission: { ordinary: false },
      category: null,
    }),
  });
}

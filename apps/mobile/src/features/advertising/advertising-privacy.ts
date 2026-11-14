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
import type { AgeDeclaration } from "./age-declaration";
import {
  getAdvertisingEligibility,
  type AdvertisingEligibilityInput,
  type AdvertisingChoices,
} from "./advertising-eligibility";
import { createInterstitialLifecycle } from "./interstitial-lifecycle";
import {
  openTransitionDestination,
  type SportingAdTransition,
} from "./sporting-ad-transition";

/** Live F05/F09/F12 owners and installation treatment; no private provider evidence is copied. */
export interface AdvertisingPrivacyContext extends Omit<
  AdvertisingEligibilityInput,
  "choices"
> {
  /** Null while a remounted installation reader has not acknowledged local storage. */
  category: AgeDeclaration["category"] | null;
}

/** Transient readiness only; native UMP retains all consent decisions and persistence. */
export interface AdvertisingPrivacySnapshot {
  choices: AdvertisingChoices | null;
  privacyOptionsRequired: boolean;
  pending: boolean;
}

/** Current context reader and optional configured V2 unit; absent units authorize no ad request. */
export interface AdvertisingPrivacyOptions {
  getContext(): AdvertisingPrivacyContext;
  adUnitId?: string;
}

/** Legacy iOS tracking configuration remains separate from the UMP authorization decision. */
function setLegacyAdvertiserTracking(enabled: boolean) {
  if (
    Platform.OS === "ios" &&
    Number.parseInt(String(Platform.Version), 10) < 17
  ) {
    setAdvertiserTrackingEnabled(enabled);
  }
}

/** Maps the installation declaration to the provider's supported request treatment. */
function ageRestrictedTreatment(category: AgeDeclaration["category"]) {
  if (category === "under16") {
    return AgeRestrictedTreatment.CHILD;
  }
  return category === "16–17"
    ? AgeRestrictedTreatment.TEEN
    : AgeRestrictedTreatment.UNSPECIFIED;
}

/**
 * Orders native configuration, UMP and conditional ATT, with one interstitial lifecycle.
 * UMP owns installation consent. Account/Pro changes retire ads without repeating consent; age
 * changes reject obsolete results. One native sequence runs at a time, without automatic retries.
 */
export function createAdvertisingPrivacy({
  getContext: initialContext,
  adUnitId,
}: AdvertisingPrivacyOptions) {
  let getContext = initialContext;
  let snapshot: AdvertisingPrivacySnapshot = {
    choices: null,
    privacyOptionsRequired: false,
    pending: false,
  };
  let attempted: {
    category: AgeDeclaration["category"];
    formDeferred: boolean;
  } | null = null;
  let disposed = false;
  let initialized = false;
  // Applied native request context only; consent decisions remain entirely SDK-owned.
  let consentCategory: AgeDeclaration["category"] | null = null;
  let trackingRequested = false;
  const listeners = new Set<() => void>();
  const interstitial = adUnitId
    ? createInterstitialLifecycle({
        adUnitId,
        getInput: () => ({ ...getContext(), choices: snapshot.choices }),
      })
    : null;

  /** Publishes only presentation/readiness, never native choice strings or profile fields. */
  function publish(next: AdvertisingPrivacySnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  /** Suspends loads before retiring even same-mode preparation; the sporting count survives. */
  function retirePreparation() {
    attempted = null;
    publish({
      ...snapshot,
      choices: null,
      privacyOptionsRequired: false,
    });
    interstitial?.invalidate();
  }

  /** Age changes and unavailable installation preparation retire native readiness. */
  function suspend() {
    consentCategory = null;
    retirePreparation();
  }

  /** Requests ATT at most once, accepting no permission result after the context is retired. */
  async function readTrackingPermission(
    current: () => boolean,
    choices: AdvertisingChoices,
  ) {
    let permission = await getTrackingPermissionsAsync();
    if (!current()) {
      return null;
    }
    if (
      permission.status === "undetermined" &&
      permission.canAskAgain &&
      !trackingRequested &&
      getAdvertisingEligibility({ ...getContext(), choices }).canServeAds
    ) {
      trackingRequested = true;
      permission = await requestTrackingPermissionsAsync();
      if (!current()) {
        return null;
      }
    }
    return permission.status === "granted";
  }

  /** Reads the SDK's current helpers, then permits tracking only for eligible consenting adults. */
  async function readChoices(
    info: AdsConsentInfo,
    context: AdvertisingPrivacyContext,
    current: () => boolean,
  ) {
    if (!info.canRequestAds) {
      return null;
    }
    let authorizedMode: AdvertisingChoices["authorizedMode"] = "contextual";
    let wantsTracking = false;
    if (context.category === "adult") {
      const native = await AdsConsent.getUserChoices();
      if (!current()) {
        return null;
      }
      authorizedMode = native.storeAndAccessInformationOnDevice
        ? "contextual"
        : "limited";
      wantsTracking =
        native.storeAndAccessInformationOnDevice &&
        native.createAPersonalisedAdsProfile &&
        native.selectPersonalisedAds &&
        native.selectBasicAds;
    }
    let tracking = Platform.OS !== "ios";
    const candidate: AdvertisingChoices = {
      canRequestAds: true,
      authorizedMode,
    };
    if (
      Platform.OS === "ios" &&
      wantsTracking &&
      getAdvertisingEligibility({ ...getContext(), choices: candidate })
        .canServeAds
    ) {
      const permission = await readTrackingPermission(current, candidate);
      if (permission === null) {
        return null;
      }
      tracking = permission;
    }
    if (wantsTracking && tracking) {
      authorizedMode = "personalized";
    }
    setLegacyAdvertiserTracking(wantsTracking && tracking);
    return { ...candidate, authorizedMode };
  }

  /** Opens UMP options only when currently applicable, retaining the captured category after acknowledged gathering. */
  async function readOptionsConsent(
    context: AdvertisingPrivacyContext,
    current: () => boolean,
  ) {
    let info: AdsConsentInfo;
    if (consentCategory !== context.category) {
      const consent = await readConsent(context, current);
      if (!consent || !current()) {
        return null;
      }
      info = consent.info;
    } else {
      info = await AdsConsent.getConsentInfo();
    }
    if (!current()) {
      return null;
    }
    if (
      info.privacyOptionsRequirementStatus !==
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    ) {
      publish({ ...snapshot, privacyOptionsRequired: false });
      return { info, formCompleted: false };
    }
    if (!getContext().admission.ordinary) {
      return null;
    }
    await AdsConsent.showPrivacyOptionsForm();
    if (!current()) {
      return null;
    }
    info = await AdsConsent.getConsentInfo();
    return { info, formCompleted: true };
  }

  /** Completes the SDK's installation flow, deferring its form while current Pro/admission excludes it. */
  async function readConsent(
    context: AdvertisingPrivacyContext,
    current: () => boolean,
  ) {
    const info =
      consentCategory === context.category
        ? await AdsConsent.getConsentInfo()
        : await AdsConsent.requestInfoUpdate({
            tagForUnderAgeOfConsent: context.category === "under16",
          });
    if (!current()) {
      return null;
    }
    consentCategory = context.category;
    if (
      !getContext().admission.ordinary ||
      getContext().pro.status === "active"
    ) {
      return { info, formCompleted: false };
    }
    return {
      info: await AdsConsent.loadAndShowConsentFormIfRequired(),
      formCompleted: true,
    };
  }

  /** One native interaction at a time; stale completions never initialize, request or publish ads. */
  function start(
    action: "consent" | "options" | "advertising",
  ): Promise<boolean> | undefined {
    if (disposed || snapshot.pending || !getContext().admission.ordinary) {
      return;
    }
    const context = getContext();
    if (context.category === null) {
      return;
    }
    const category = context.category;
    const privacyOptionsRequired =
      (action === "options" || consentCategory === context.category) &&
      snapshot.privacyOptionsRequired;
    if (action !== "advertising") {
      retirePreparation();
    }
    attempted = { category, formDeferred: false };
    publish({
      ...snapshot,
      privacyOptionsRequired,
      pending: true,
    });
    const current = () =>
      !disposed &&
      (getContext().category === null || getContext().category === category);

    /** Applies the native APIs in their documented sequence, with no retry/reset or consent parser. */
    async function run() {
      try {
        let info: AdsConsentInfo;
        let formCompleted = false;
        if (action !== "advertising") {
          if (consentCategory !== category) {
            await mobileAds().setRequestConfiguration({
              ageRestrictedTreatment: ageRestrictedTreatment(category),
              maxAdContentRating:
                category === "under16"
                  ? MaxAdContentRating.G
                  : MaxAdContentRating.T,
            });
          }
          if (!current()) {
            return false;
          }
          const consent =
            action === "options"
              ? await readOptionsConsent(context, current)
              : await readConsent(context, current);
          if (!consent) {
            return false;
          }
          info = consent.info;
          formCompleted = consent.formCompleted;
          if (!current()) {
            return false;
          }
          publish({
            ...snapshot,
            privacyOptionsRequired:
              info.privacyOptionsRequirementStatus ===
              AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
          });
        } else {
          info = await AdsConsent.getConsentInfo();
        }
        if (!current()) {
          return false;
        }
        const choices = await readChoices(info, context, current);
        if (!current()) {
          return false;
        }
        if (
          getAdvertisingEligibility({ ...getContext(), choices }).canServeAds &&
          !initialized
        ) {
          await mobileAds().initialize();
          initialized = true;
        }
        if (!current()) {
          return false;
        }
        if (action === "consent") {
          attempted = { category, formDeferred: !formCompleted };
        }
        publish({ ...snapshot, choices });
        interstitial?.preload();
        return formCompleted;
      } catch {
        if (current()) {
          attempted = { category, formDeferred: false };
          publish({ ...snapshot, choices: null });
        }
        throw new Error("Advertising choices could not be established");
      } finally {
        if (!disposed) {
          publish({ ...snapshot, pending: false });
        }
      }
    }

    return run();
  }

  /** Reads native entry-point applicability without changing consent, readiness or frequency. */
  function refreshOptions(): Promise<boolean> | undefined {
    if (disposed || snapshot.pending || !getContext().admission.ordinary) {
      return;
    }
    const category = getContext().category;
    const current = () =>
      !disposed &&
      (getContext().category === null || getContext().category === category);
    publish({ ...snapshot, pending: true });
    return AdsConsent.getConsentInfo()
      .then(
        (info) => {
          if (!current()) {
            return false;
          }
          publish({
            ...snapshot,
            privacyOptionsRequired:
              info.privacyOptionsRequirementStatus ===
              AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
          });
          return true;
        },
        () => {
          if (current()) {
            publish({ ...snapshot, privacyOptionsRequired: false });
          }
          return false;
        },
      )
      .finally(() => {
        if (!disposed) {
          publish({ ...snapshot, pending: false });
        }
      });
  }

  return {
    getSnapshot: () => snapshot,
    /** Rebinds live React owners after commit; the constructor never reads them during render. */
    setContext(read: AdvertisingPrivacyOptions["getContext"]) {
      getContext = read;
    },
    /** React subscribes to the single native readiness owner. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    suspend,
    /** Account and rights changes retire the SDK resource, retaining installation consent and frequency. */
    invalidateAd() {
      interstitial?.invalidate();
    },
    refreshOptions,
    /** Native applicability is rechecked at activation; an unavailable form is never invoked. */
    showOptions: () => start("options"),
    /** Prepares each installation category once; current rights independently permit initialization and load. */
    synchronize() {
      if (snapshot.pending) {
        return;
      }
      const context = getContext();
      if (context.category === null) {
        return;
      }
      if (context.category !== attempted?.category) {
        return start("consent");
      }
      if (attempted.formDeferred && context.pro.status !== "active") {
        return start("consent");
      }
      if (initialized) {
        interstitial?.preload();
        return;
      }
      if (
        getAdvertisingEligibility({ ...context, choices: snapshot.choices })
          .canServeAds
      ) {
        return start("advertising");
      }
    },
    /** Existing sporting consumers retain intent/failure ownership and the one shared threshold. */
    openSportingTransition(action: SportingAdTransition) {
      if (interstitial) {
        return interstitial.transition(action);
      }
      if (!action.isCurrent()) {
        return Promise.resolve({ status: "abandoned" as const });
      }
      return openTransitionDestination(action.open);
    },
    /** Detaches native preparation without changing installation persistence or resetting SDK consent. */
    dispose() {
      disposed = true;
      suspend();
      interstitial?.dispose();
      listeners.clear();
    },
  };
}

/** Allocates the installation-wide SDK owner, closed until its React context supplies actual eligibility. */
export function createInstallationAdvertisingPrivacy() {
  return createAdvertisingPrivacy({
    adUnitId:
      Platform.OS === "ios"
        ? Constants.expoConfig?.extra?.advertising?.iosInterstitialUnitId
        : Constants.expoConfig?.extra?.advertising?.androidInterstitialUnitId,
    getContext: () => ({
      account: { subject: null, accountId: null, status: "guest" },
      pro: { status: "guest" },
      admission: { ordinary: false },
      category: "under16",
    }),
  });
}

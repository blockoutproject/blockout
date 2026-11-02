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
import type { SessionSnapshot } from "../accounts";
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
  category: AgeDeclaration["category"];
}

/** Transient readiness only; native UMP retains all consent decisions and persistence. */
export interface AdvertisingPrivacySnapshot {
  choices: AdvertisingChoices | null;
  privacyOptionsRequired: boolean;
  pending: boolean;
  failure: "gather" | "refresh" | "options" | null;
}

/** Current context reader and optional configured V2 unit; absent units authorize no ad request. */
export interface AdvertisingPrivacyOptions {
  getContext(): AdvertisingPrivacyContext;
  adUnitId?: string;
}

/** Identifies one applicable attempt, including business-account establishment. */
function contextKey(context: AdvertisingPrivacyContext) {
  const session = context.account;
  return `${session.subject}:${session.accountId}:${context.account.status}:${context.pro.status}:${context.admission.ordinary}:${context.category}`;
}

/**
 * Orders native configuration, UMP and conditional ATT, with one interstitial lifecycle.
 * No consent is mirrored or reset. Context changes retire preparation synchronously; an active
 * native call settles before the next context can start. Failed attempts require explicit retry.
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
    failure: null,
  };
  let attempted: string | null = null;
  let revision = 0;
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
    revision++;
    attempted = null;
    publish({
      ...snapshot,
      choices: null,
      privacyOptionsRequired: false,
      failure: null,
    });
    interstitial?.invalidate();
  }

  /** Owner changes require a fresh native information/gathering acknowledgement before options can resume ads. */
  function suspend() {
    consentCategory = null;
    retirePreparation();
  }

  /** Reads the SDK's current helpers, then permits tracking only for eligible consenting adults. */
  async function readChoices(
    info: AdsConsentInfo,
    context: AdvertisingPrivacyContext,
    session: SessionSnapshot,
    current: () => boolean,
  ) {
    if (!info.canRequestAds) return null;
    let authorizedMode: AdvertisingChoices["authorizedMode"] = "contextual";
    let wantsTracking = false;
    if (context.category === "adult") {
      const native = await AdsConsent.getUserChoices();
      if (!current()) return null;
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
      session,
      canRequestAds: true,
      authorizedMode,
    };
    if (
      Platform.OS === "ios" &&
      wantsTracking &&
      getAdvertisingEligibility({ ...getContext(), choices: candidate })
        .canServeAds
    ) {
      let permission = await getTrackingPermissionsAsync();
      if (!current()) return null;
      if (
        permission.status === "undetermined" &&
        permission.canAskAgain &&
        !trackingRequested
      ) {
        trackingRequested = true;
        permission = await requestTrackingPermissionsAsync();
        if (!current()) return null;
      }
      tracking = permission.status === "granted";
    }
    if (wantsTracking && tracking) authorizedMode = "personalized";
    if (
      Platform.OS === "ios" &&
      Number.parseInt(String(Platform.Version), 10) < 17
    )
      setAdvertiserTrackingEnabled(wantsTracking && tracking);
    return { ...candidate, authorizedMode };
  }

  /** One native interaction at a time; stale completions never initialize, request or publish ads. */
  function start(
    action: "gather" | "refresh" | "options",
  ): Promise<boolean> | undefined {
    if (disposed || snapshot.pending || !getContext().admission.ordinary)
      return;
    const context = getContext();
    const key = contextKey(context);
    const session = context.account;
    const privacyOptionsRequired =
      (action === "options" || consentCategory === context.category) &&
      snapshot.privacyOptionsRequired;
    retirePreparation();
    const attempt = revision;
    attempted = key;
    publish({
      ...snapshot,
      privacyOptionsRequired,
      pending: true,
      failure: null,
    });
    const current = () =>
      !disposed && revision === attempt && contextKey(getContext()) === key;

    /** Applies the native APIs in their documented sequence, with no retry/reset or consent parser. */
    async function run() {
      try {
        await mobileAds().setRequestConfiguration({
          ageRestrictedTreatment:
            context.category === "under16"
              ? AgeRestrictedTreatment.CHILD
              : context.category === "16–17"
                ? AgeRestrictedTreatment.TEEN
                : AgeRestrictedTreatment.UNSPECIFIED,
          maxAdContentRating:
            context.category === "under16"
              ? MaxAdContentRating.G
              : MaxAdContentRating.T,
        });
        if (!current()) return false;
        let info: AdsConsentInfo;
        let optionsShown = action !== "options";
        if (action === "options") {
          if (consentCategory !== context.category) {
            info = await AdsConsent.gatherConsent({
              tagForUnderAgeOfConsent: context.category === "under16",
            });
            if (!current()) return false;
            consentCategory = context.category;
          } else info = await AdsConsent.getConsentInfo();
          if (!current()) return false;
          if (
            info.privacyOptionsRequirementStatus !==
            AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
          ) {
            publish({ ...snapshot, privacyOptionsRequired: false });
          } else {
            await AdsConsent.showPrivacyOptionsForm();
            if (!current()) return false;
            info = await AdsConsent.getConsentInfo();
            optionsShown = true;
          }
        } else {
          const options = {
            tagForUnderAgeOfConsent: context.category === "under16",
          };
          info =
            action === "gather"
              ? await AdsConsent.gatherConsent(options)
              : await AdsConsent.requestInfoUpdate(options);
        }
        if (!current()) return false;
        consentCategory = context.category;
        publish({
          ...snapshot,
          privacyOptionsRequired:
            info.privacyOptionsRequirementStatus ===
            AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        });
        const choices = await readChoices(info, context, session, current);
        if (!current()) return false;
        if (
          getAdvertisingEligibility({ ...getContext(), choices }).canServeAds &&
          !initialized
        ) {
          await mobileAds().initialize();
          initialized = true;
        }
        if (!current()) return false;
        publish({ ...snapshot, choices });
        interstitial?.preload();
        return optionsShown;
      } catch {
        if (current()) publish({ ...snapshot, choices: null, failure: action });
        throw new Error("Advertising choices could not be established");
      } finally {
        if (!disposed) publish({ ...snapshot, pending: false });
      }
    }
    return run();
  }

  /** Reads native entry-point applicability without changing consent, readiness, failure or frequency. */
  function refreshOptions(): Promise<boolean> | undefined {
    if (disposed || snapshot.pending || !getContext().admission.ordinary)
      return;
    const key = contextKey(getContext());
    const attempt = revision;
    const current = () =>
      !disposed && revision === attempt && contextKey(getContext()) === key;
    publish({ ...snapshot, pending: true });
    return AdsConsent.getConsentInfo()
      .then(
        (info) => {
          if (!current()) return false;
          publish({
            ...snapshot,
            privacyOptionsRequired:
              info.privacyOptionsRequirementStatus ===
              AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
          });
          return true;
        },
        () => {
          if (current())
            publish({ ...snapshot, privacyOptionsRequired: false });
          return false;
        },
      )
      .finally(() => {
        if (!disposed) publish({ ...snapshot, pending: false });
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
    /** Explicit preparation/retry; UMP reuses applicable decisions through its own persistence. */
    prepare: () => start("gather"),
    refreshOptions,
    /** Native applicability is rechecked at activation; an unavailable form is never invoked. */
    showOptions: () => start("options"),
    /** Retries only the failed native interaction, after an explicit user action. */
    retry: () => (snapshot.failure ? start(snapshot.failure) : undefined),
    /** Synchronizes changed owner inputs once; errors for unchanged inputs never cause an automatic retry. */
    synchronize() {
      if (contextKey(getContext()) === attempted || snapshot.pending) return;
      return start(getContext().pro.status === "active" ? "refresh" : "gather");
    },
    /** Existing sporting consumers retain intent/failure ownership and the one shared threshold. */
    openSportingTransition(action: SportingAdTransition) {
      if (interstitial) return interstitial.transition(action);
      if (!action.isCurrent())
        return Promise.resolve({ status: "abandoned" as const });
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

import { Platform } from "react-native";
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdapterStatus,
  InitializationState,
} from "react-native-google-mobile-ads";

import {
  mapAdvertisingError,
  reportAdvertisingFailure,
} from "@/src/modules/advertising/api/advertising-diagnostics";

export type AdapterReadiness = {
  name: string;
  ready: boolean;
};

export type AdvertisingBootstrapResult = {
  status: "failed" | "partial" | "ready" | "unavailable";
  consentEvidence: "cached" | "fresh" | "unavailable";
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  adapterReadiness: AdapterReadiness[];
  errorCode: string | null;
};

let initializationResult: AdvertisingBootstrapResult | null = null;
let initializationPromise: Promise<AdvertisingBootstrapResult> | null = null;

/** Maps the native UMP requirement to the provider's public boolean state. */
function requiresPrivacyOptions(
  status: AdsConsentPrivacyOptionsRequirementStatus,
) {
  return status === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
}

/**
 * Requests ATT only after the active UMP policy permits purpose-one access.
 */
async function requestTrackingIfPermitted() {
  if (Platform.OS !== "ios") return;

  try {
    const gdprApplies = await AdsConsent.getGdprApplies();
    const purposeConsents = gdprApplies
      ? await AdsConsent.getPurposeConsents()
      : "";
    const mayRequestTracking =
      !gdprApplies || purposeConsents.charAt(0) === "1";

    if (!mayRequestTracking) return;

    const permission = await getTrackingPermissionsAsync();
    if (permission.status === PermissionStatus.UNDETERMINED) {
      await requestTrackingPermissionsAsync();
    }
  } catch (error) {
    reportAdvertisingFailure({
      operation: "consent",
      outcome: "failed",
      errorCode: mapAdvertisingError(error, "att-evaluation-failed"),
    });
  }
}

/** Removes native adapter descriptions while retaining stable readiness. */
function mapAdapterReadiness(adapters: AdapterStatus[]): AdapterReadiness[] {
  return adapters.map((adapter) => ({
    name: adapter.name,
    ready:
      adapter.state === InitializationState.AdapterInitializationStateReady,
  }));
}

/**
 * Applies the current consent gate and returns explicit SDK adapter evidence.
 */
async function initializeFromConsent(
  consentInfo: Awaited<ReturnType<typeof AdsConsent.getConsentInfo>>,
  consentEvidence: AdvertisingBootstrapResult["consentEvidence"],
  startedAt: number,
  initializedAdapters?: AdapterReadiness[],
): Promise<AdvertisingBootstrapResult> {
  const privacyOptionsRequired = requiresPrivacyOptions(
    consentInfo.privacyOptionsRequirementStatus,
  );

  if (!consentInfo.canRequestAds) {
    return {
      status: "unavailable",
      consentEvidence: consentEvidence === "cached" ? "cached" : "unavailable",
      canRequestAds: false,
      privacyOptionsRequired,
      adapterReadiness: [],
      errorCode: null,
    };
  }

  await requestTrackingIfPermitted();

  const adapterReadiness =
    initializedAdapters ?? mapAdapterReadiness(await mobileAds().initialize());
  const hasUnavailableAdapter = adapterReadiness.some(
    (adapter) => !adapter.ready,
  );

  if (hasUnavailableAdapter) {
    reportAdvertisingFailure({
      operation: "initialization",
      outcome: "partial",
      errorCode: "adapter-not-ready",
      durationMs: Date.now() - startedAt,
      consentAvailable: true,
      adapterReadiness,
    });
  }

  return {
    status: hasUnavailableAdapter ? "partial" : "ready",
    consentEvidence,
    canRequestAds: true,
    privacyOptionsRequired,
    adapterReadiness,
    errorCode: null,
  };
}

/**
 * Refreshes UMP, conditionally requests ATT, and initializes Google Mobile Ads
 * only when the current or cached consent evidence permits ad requests.
 */
export async function runAdvertisingBootstrap(): Promise<AdvertisingBootstrapResult> {
  const startedAt = Date.now();
  let consentEvidence: AdvertisingBootstrapResult["consentEvidence"] = "fresh";

  try {
    let consentInfo;

    try {
      await AdsConsent.requestInfoUpdate();
      consentInfo = await AdsConsent.loadAndShowConsentFormIfRequired();
    } catch (error) {
      consentEvidence = "cached";
      reportAdvertisingFailure({
        operation: "consent",
        outcome: "failed",
        errorCode: mapAdvertisingError(error, "consent-refresh-failed"),
        durationMs: Date.now() - startedAt,
        consentAvailable: false,
      });
      consentInfo = await AdsConsent.getConsentInfo();
    }

    return await initializeFromConsent(consentInfo, consentEvidence, startedAt);
  } catch (error) {
    const errorCode = mapAdvertisingError(error, "initialization-failed");
    reportAdvertisingFailure({
      operation: "initialization",
      outcome: "failed",
      errorCode,
      durationMs: Date.now() - startedAt,
    });
    return {
      status: "failed",
      consentEvidence: "unavailable",
      canRequestAds: false,
      privacyOptionsRequired: false,
      adapterReadiness: [],
      errorCode,
    };
  }
}

/**
 * Deduplicates the native initialization process across provider remounts.
 */
export function initializeAdvertisingOnce() {
  if (initializationResult) return Promise.resolve(initializationResult);

  if (!initializationPromise) {
    initializationPromise = runAdvertisingBootstrap().then((result) => {
      initializationResult = result;
      return result;
    });
  }

  return initializationPromise;
}

/**
 * Presents the UMP privacy-options form and returns its updated request gate.
 */
export async function showAdvertisingPrivacyOptions() {
  const startedAt = Date.now();
  const consentInfo = await AdsConsent.showPrivacyOptionsForm();
  const initializedAdapters = initializationResult?.canRequestAds
    ? initializationResult.adapterReadiness
    : undefined;
  const result = await initializeFromConsent(
    consentInfo,
    "fresh",
    startedAt,
    initializedAdapters,
  );
  initializationResult = result;
  return result;
}

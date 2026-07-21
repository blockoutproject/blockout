import {Platform} from "react-native";
import mobileAds, {AdsConsent, AdsConsentStatus,} from "react-native-google-mobile-ads";
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";

let adsReady = false;
let initializing: Promise<void> | null = null;
const listeners: Array<() => void> = [];

export function onAdsReady(listener: () => void) {
  if (adsReady) {
    listener();
    return () => {
    };
  }
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

async function runInitFlow() {
  try {
    if (__DEV__) {
      await AdsConsent.reset();
    }

    const consentInfo = await AdsConsent.requestInfoUpdate();

    if (
      consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdsConsentStatus.REQUIRED
    ) {
      await AdsConsent.showForm();
    }

    if (Platform.OS === "ios") {
      const {status} = await getTrackingPermissionsAsync();
      if (status === PermissionStatus.UNDETERMINED) {
        await requestTrackingPermissionsAsync();
      }
    }

    await mobileAds().initialize();

    adsReady = true;
    listeners.forEach((fn) => fn());
    listeners.length = 0;
  } catch (e) {
    console.warn("[Ads] init failed", e);
  } finally {
    initializing = null;
  }
}

export function initAdsOnce(): Promise<void> {
  if (adsReady) return Promise.resolve();
  if (!initializing) {
    initializing = runInitFlow();
  }
  return initializing;
}

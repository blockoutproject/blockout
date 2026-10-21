import type { ExpoConfig } from "expo/config";

const variant = process.env.APP_VARIANT;
const production = variant === "production";
const preview = variant === "preview";
const release = production || preview;
const testStoreApiKey = process.env.REVENUECAT_TEST_STORE_API_KEY;
const iosApiKey = process.env.REVENUECAT_IOS_API_KEY;
const androidApiKey = process.env.REVENUECAT_ANDROID_API_KEY;

if (
  production &&
  (testStoreApiKey ||
    iosApiKey?.startsWith("test_") ||
    androidApiKey?.startsWith("test_"))
) {
  throw new Error(
    "Production candidates must not contain RevenueCat Test Store keys.",
  );
}

const easSlug = process.env.EXPO_PROJECT_SLUG;
const applicationId = production
  ? "com.blockoutproject.blockout"
  : preview
    ? "com.blockoutproject.blockout.preproduction"
    : "com.blockout.local";

if (variant && !easSlug) {
  throw new Error("EAS profiles require the existing EXPO_PROJECT_SLUG.");
}

/** Uses Expo's build-time variants and F14's retained production identity; no runtime selector. */
const config: ExpoConfig = {
  name: production
    ? "Blockout"
    : preview
      ? "Blockout Preprod"
      : "Blockout Local",
  slug: easSlug ?? "blockout-local",
  version: "0.0.0",
  userInterfaceStyle: "automatic",
  ...(!release ? { scheme: "blockout-local" } : {}),
  platforms: ["ios", "android"],
  plugins: [
    "expo-router",
    ["react-native-auth0", { domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN }],
    [
      "react-native-google-mobile-ads",
      {
        // Google's sample apps allow native startup without configuring a provider account.
        iosAppId:
          process.env.ADMOB_IOS_APP_ID ||
          "ca-app-pub-3940256099942544~1458002511",
        androidAppId:
          process.env.ADMOB_ANDROID_APP_ID ||
          "ca-app-pub-3940256099942544~3347511713",
        delayAppMeasurementInit: true,
        skAdNetworkItems: ["cstr6suwn9.skadnetwork"],
      },
    ],
    [
      "@react-native-google-mobile-ads/facebook",
      {
        skAdNetworkItems: ["v9wttpbfk9.skadnetwork", "n38lu8286q.skadnetwork"],
      },
    ],
    [
      "expo-tracking-transparency",
      {
        userTrackingPermission:
          "Votre autorisation permet d’utiliser l’identifiant publicitaire pour vous proposer des publicités personnalisées.",
      },
    ],
    "expo-web-browser",
    [
      "expo-image-picker",
      { cameraPermission: false, microphonePermission: false },
    ],
    [
      "expo-font",
      {
        android: {
          fonts: [
            {
              fontFamily: "Outfit",
              fontDefinitions: [
                { path: "./assets/fonts/Outfit-Regular.ttf", weight: 400 },
                { path: "./assets/fonts/Outfit-Medium.ttf", weight: 500 },
                { path: "./assets/fonts/Outfit-SemiBold.ttf", weight: 600 },
                { path: "./assets/fonts/Outfit-Bold.ttf", weight: 700 },
              ],
            },
          ],
        },
        ios: {
          fonts: [
            "./assets/fonts/Outfit-Regular.ttf",
            "./assets/fonts/Outfit-Medium.ttf",
            "./assets/fonts/Outfit-SemiBold.ttf",
            "./assets/fonts/Outfit-Bold.ttf",
          ],
        },
      },
    ],
    // Expo 57 requires scene lifecycle opt-in when building with Xcode 27.
    ["expo-build-properties", { ios: { enableSceneSupport: true } }],
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],
  ios: {
    bundleIdentifier: applicationId,
    supportsTablet: false,
  },
  android: {
    package: applicationId,
  },
  extra: {
    ...(easSlug
      ? { eas: { projectId: "10cdf86a-a81e-496a-bcaa-07c132678f6d" } }
      : {}),
    // Public V2 inputs only; the future F11 lifecycle owns consent and SDK initialization.
    advertising: {
      iosInterstitialUnitId: process.env.ADMOB_V2_IOS_INTERSTITIAL_UNIT_ID,
      androidInterstitialUnitId:
        process.env.ADMOB_V2_ANDROID_INTERSTITIAL_UNIT_ID,
    },
    // Public SDK keys only. Identity association remains with the Pro lifecycle owner.
    revenueCat: {
      iosApiKey: testStoreApiKey || iosApiKey,
      androidApiKey: testStoreApiKey || androidApiKey,
      offeringIdentifier: process.env.REVENUECAT_V2_OFFERING_ID,
      supportActionIdentifier: process.env.REVENUECAT_SUPPORT_ACTION_ID,
    },
  },
};

export default config;

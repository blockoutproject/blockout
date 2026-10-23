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
        // Google's buyer list includes Meta's two IDs; declare each identifier once.
        // https://developers.google.com/admob/ios/quick-start#update_your_infoplist_file
        skAdNetworkItems: [
          "cstr6suwn9.skadnetwork",
          "4fzdc2evr5.skadnetwork",
          "2fnua5tdw4.skadnetwork",
          "ydx93a7ass.skadnetwork",
          "p78axxw29g.skadnetwork",
          "v72qych5uu.skadnetwork",
          "ludvb6z3bs.skadnetwork",
          "cp8zw746q7.skadnetwork",
          "3sh42y64q3.skadnetwork",
          "c6k4g5qg8m.skadnetwork",
          "s39g8k73mm.skadnetwork",
          "wg4vff78zm.skadnetwork",
          "3qy4746246.skadnetwork",
          "f38h382jlk.skadnetwork",
          "hs6bdukanm.skadnetwork",
          "mlmmfzh3r3.skadnetwork",
          "v4nxqhlyqp.skadnetwork",
          "wzmmz9fp6w.skadnetwork",
          "su67r6k2v3.skadnetwork",
          "yclnxrl5pm.skadnetwork",
          "t38b2kh725.skadnetwork",
          "7ug5zh24hu.skadnetwork",
          "gta9lk7p23.skadnetwork",
          "vutu7akeur.skadnetwork",
          "y5ghdn5j9k.skadnetwork",
          "v9wttpbfk9.skadnetwork",
          "n38lu8286q.skadnetwork",
          "47vhws6wlr.skadnetwork",
          "kbd757ywx3.skadnetwork",
          "9t245vhmpl.skadnetwork",
          "a2p9lx4jpn.skadnetwork",
          "22mmun2rn5.skadnetwork",
          "44jx6755aq.skadnetwork",
          "k674qkevps.skadnetwork",
          "4468km3ulz.skadnetwork",
          "2u9pt9hc89.skadnetwork",
          "8s468mfl3y.skadnetwork",
          "klf5c3l5u5.skadnetwork",
          "ppxm28t8ap.skadnetwork",
          "kbmxgpxpgc.skadnetwork",
          "uw77j35x4d.skadnetwork",
          "578prtvx9j.skadnetwork",
          "4dzt52r2t5.skadnetwork",
          "tl55sbb4fm.skadnetwork",
          "c3frkrj4fj.skadnetwork",
          "e5fvkxwrpn.skadnetwork",
          "8c4e2ghe7u.skadnetwork",
          "3rd42ekr43.skadnetwork",
          "97r2b46745.skadnetwork",
          "3qcr597p9d.skadnetwork",
        ],
      },
    ],
    [
      "expo-tracking-transparency",
      {
        // App-owned permission copy follows F13 FR-029's French product scope.
        userTrackingPermission:
          "Votre autorisation permet d’utiliser l’identifiant publicitaire pour vous proposer des publicités personnalisées.",
      },
    ],
    [
      "expo-image-picker",
      { cameraPermission: false, microphonePermission: false },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/Outfit-Regular.ttf",
          "./assets/fonts/Outfit-Medium.ttf",
          "./assets/fonts/Outfit-SemiBold.ttf",
          "./assets/fonts/Outfit-Bold.ttf",
        ],
      },
    ],
    [
      "expo-build-properties",
      {
        // Google Mobile Ads 25.4 metadata requires a newer compiler than RN's 2.1 default.
        android: { kotlinVersion: "2.2.21", minSdkVersion: 29 },
        // Expo 57 requires scene lifecycle opt-in when building with Xcode 27.
        ios: { enableSceneSupport: true },
      },
    ],
    "./plugins/with-android-kotlin-compiler.cjs",
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

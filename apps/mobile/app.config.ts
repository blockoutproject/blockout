import type { ExpoConfig } from "expo/config";

const variant = process.env.APP_VARIANT;
const production = variant === "production";
const previewRelease = variant === "preview";
const previewTestStore = variant === "preview-test-store";
const release = production || previewRelease;
const preview = previewRelease || previewTestStore;
const googleDemoPublisher = "ca-app-pub-3940256099942544";
// Google sample app IDs let the native SDK start without a configured provider app.
const admobIosAppId =
  process.env.ADMOB_IOS_APP_ID?.trim() || `${googleDemoPublisher}~1458002511`;
const admobAndroidAppId =
  process.env.ADMOB_ANDROID_APP_ID?.trim() ||
  `${googleDemoPublisher}~3347511713`;
const testStoreApiKey = process.env.REVENUECAT_TEST_STORE_API_KEY;
// The preproduction Test Store client can start without enabling purchases.
const iosApiKey = previewTestStore
  ? undefined
  : process.env.REVENUECAT_IOS_API_KEY;
const androidApiKey = previewTestStore
  ? undefined
  : process.env.REVENUECAT_ANDROID_API_KEY;

// RevenueCat's native SDK rejects Test Store keys in Release builds.
if (
  release &&
  (testStoreApiKey ||
    iosApiKey?.startsWith("test_") ||
    androidApiKey?.startsWith("test_"))
) {
  throw new Error("RevenueCat Test Store keys require a Debug build.");
}

if (
  previewTestStore &&
  testStoreApiKey &&
  !testStoreApiKey.startsWith("test_")
) {
  throw new Error(
    "The preview Test Store client requires a RevenueCat Test Store key.",
  );
}

const easSlug = process.env.EXPO_PROJECT_SLUG;
// Public build-time identity. Keep the retained EAS default unless an isolated project is explicit.
const expoProjectId =
  process.env.EXPO_PROJECT_ID ??
  (easSlug ? "10cdf86a-a81e-496a-bcaa-07c132678f6d" : undefined);
let applicationId = "com.blockoutproject.blockout.local";
let applicationName = "Blockout Local";
if (production) {
  applicationId = "com.blockoutproject.blockout";
  applicationName = "Blockout";
} else if (preview) {
  applicationId = "com.blockoutproject.blockout.preproduction";
  applicationName = "Blockout Preprod";
}

if (variant && !easSlug) {
  throw new Error("EAS profiles require the existing EXPO_PROJECT_SLUG.");
}

/** A configured app can keep its UMP choices available without serving interstitials. */
function platformAdvertising(appId: string, unitInput?: string) {
  if (production && appId.startsWith(googleDemoPublisher)) {
    return undefined;
  }
  const adUnitId = unitInput?.trim();
  if (!adUnitId || (production && adUnitId.startsWith(googleDemoPublisher))) {
    return {};
  }
  return { adUnitId };
}

/** Uses Expo's build-time variants and F14's retained production identity; no runtime selector. */
const config: ExpoConfig = {
  name: applicationName,
  slug: easSlug ?? "blockout-local",
  version: "2.0.0",
  icon: "./assets/app-icon.png",
  userInterfaceStyle: "automatic",
  ...(!production && !preview ? { scheme: "blockout-local" } : {}),
  platforms: ["ios", "android"],
  plugins: [
    ["expo-router", { sitemap: false }],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-brand-light.png",
        imageWidth: 144,
        backgroundColor: "#FCFCFD",
        dark: {
          image: "./assets/splash-brand-dark.png",
          backgroundColor: "#0D0D0E",
        },
      },
    ],
    "expo-image",
    "@config-plugins/react-native-blob-util",
    "@config-plugins/react-native-pdf",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        defaultChannel: "default",
        enableBackgroundRemoteNotifications: false,
      },
    ],
    [
      "react-native-maps",
      {
        // Apple Maps remains native on iOS; only Android receives a restricted build-time key.
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    ],
    "expo-status-bar",
    "expo-web-browser",
    ["react-native-auth0", { domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN }],
    [
      "react-native-google-mobile-ads",
      {
        iosAppId: admobIosAppId,
        androidAppId: admobAndroidAppId,
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
      {
        photosPermission:
          "Blockout accède à vos photos pour vous permettre de choisir une image.",
        cameraPermission: false,
        microphonePermission: false,
      },
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
        android: {
          minSdkVersion: 29,
          // The transitive Room 2.2.5 rule keeps this class but drops its reflected constructor in R8 full mode.
          extraProguardRules:
            "-keepclassmembers class androidx.work.impl.WorkDatabase_Impl { public <init>(); }",
        },
      },
    ],
    [
      "@sentry/react-native",
      {
        // F13 keeps reporting and debug-file uploads disabled.
        disableAutoUpload: true,
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],
  ios: {
    bundleIdentifier: applicationId,
    deploymentTarget: "16.4",
    icon: {
      light: "./assets/app-icon.png",
      dark: "./assets/app-icon-dark.png",
    },
    supportsTablet: false,
  },
  android: {
    package: applicationId,
    adaptiveIcon: {
      foregroundImage: "./assets/app-icon-foreground.png",
      backgroundColor: "#303034",
      monochromeImage: "./assets/app-icon-monochrome.png",
    },
    // Private file input supplied by the authorized build environment, never committed.
    googleServicesFile: process.env.FCM_GOOGLE_SERVICES_FILE,
  },
  extra: {
    ...(expoProjectId ? { eas: { projectId: expoProjectId } } : {}),
    advertising: {
      ios: platformAdvertising(
        admobIosAppId,
        process.env.ADMOB_V2_IOS_INTERSTITIAL_UNIT_ID,
      ),
      android: platformAdvertising(
        admobAndroidAppId,
        process.env.ADMOB_V2_ANDROID_INTERSTITIAL_UNIT_ID,
      ),
    },
    // Public SDK keys only. Identity association remains with the Pro lifecycle owner.
    revenueCat: {
      iosApiKey: testStoreApiKey || iosApiKey,
      androidApiKey: testStoreApiKey || androidApiKey,
      offeringIdentifier: process.env.REVENUECAT_OFFERING_ID,
    },
  },
};

export default config;

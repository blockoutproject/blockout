import type { ExpoConfig } from "expo/config";

const variant = process.env.APP_VARIANT;
const production = variant === "production";
const preview = variant === "preview";
const release = production || preview;
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
  ...(easSlug
    ? { extra: { eas: { projectId: "10cdf86a-a81e-496a-bcaa-07c132678f6d" } } }
    : {}),
};

export default config;

import type { ExpoConfig } from "expo/config";

/** Local development identity; F14 owns the later production/store identifiers. */
const config: ExpoConfig = {
  name: "Blockout Local",
  slug: "blockout-local",
  version: "0.0.0",
  scheme: "blockout-local",
  platforms: ["ios", "android"],
  plugins: [
    "expo-router",
    // Expo 57 requires scene lifecycle opt-in when building with Xcode 27.
    ["expo-build-properties", { ios: { enableSceneSupport: true } }],
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
    [
      "./plugins/with-sentry-privacy.cjs",
      {
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
        environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
      },
    ],
  ],
  ios: { bundleIdentifier: "com.blockout.local", supportsTablet: false },
  android: { package: "com.blockout.local" },
};

export default config;

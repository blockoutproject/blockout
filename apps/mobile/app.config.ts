import type { ExpoConfig } from "expo/config";

/** Local development identity; F14 owns the later production/store identifiers. */
const config: ExpoConfig = {
  name: "Blockout Local",
  slug: "blockout-local",
  version: "0.0.0",
  scheme: "blockout-local",
  platforms: ["ios", "android"],
  plugins: ["expo-router"],
  ios: { bundleIdentifier: "com.blockout.local", supportsTablet: false },
  android: { package: "com.blockout.local" },
};

export default config;

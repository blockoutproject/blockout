const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  preset: "jest-expo",
  // Reanimated owns its Jest resolver; use its supported JavaScript implementation.
  resolver: "react-native-reanimated/jest/resolver",
  // Sentry and RevenueCat's public entry points include ESM SDK packages.
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.replace("@sentry/react-native", "@sentry|@revenuecat"),
  ),
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  clearMocks: true,
  // Bound ordinary CI workers while allowing focused runs to opt into --runInBand.
  maxWorkers: 2,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  // Use Lucide's public CommonJS export in Jest; Metro selects its native ESM export.
  moduleNameMapper: {
    "^lucide-react-native$": require.resolve("lucide-react-native"),
  },
};

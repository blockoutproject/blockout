const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  preset: "jest-expo",
  // Reanimated owns its Jest resolver; use its supported JavaScript implementation.
  resolver: "react-native-reanimated/jest/resolver",
  // Sentry's native conditional exports select ESM across its SDK packages.
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.replace("@sentry/react-native", "@sentry"),
  ),
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  // Use Lucide's public CommonJS export in Jest; Metro selects its native ESM export.
  moduleNameMapper: {
    "^lucide-react-native$": require.resolve("lucide-react-native"),
  },
};

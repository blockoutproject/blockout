module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  // Use Lucide's public CommonJS export in Jest; Metro selects its native ESM export.
  moduleNameMapper: {
    "^lucide-react-native$": require.resolve("lucide-react-native"),
  },
};

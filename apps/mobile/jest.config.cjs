module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
};

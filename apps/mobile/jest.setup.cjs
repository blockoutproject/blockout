/* global jest */
// Expo's native UUID stub returns undefined; Node supplies the same UUID contract in Jest.
jest.mock("expo-crypto", () => ({
  ...jest.requireActual("expo-crypto"),
  randomUUID: require("node:crypto").randomUUID,
}));

// The installed Reanimated 4.5 mock controls native animation without inventing a test renderer.
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock"),
);
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

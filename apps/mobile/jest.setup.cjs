/* global jest */
// The installed Reanimated 4.5 mock controls native animation without inventing a test renderer.
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock"),
);
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

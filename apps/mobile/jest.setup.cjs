/* global jest */
// The application root now mounts RNGH; retain the package's native Jest boundary in every root consumer.
require("react-native-gesture-handler/jestSetup");

// Root consumers share this native notifications boundary. Lifecycle suites explicitly supply SDK events/outcomes.
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  getLastNotificationResponse: jest.fn().mockReturnValue(null),
  clearLastNotificationResponse: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

// Expo's native UUID stub returns undefined; Node supplies the same UUID contract in Jest.
jest.mock("expo-crypto", () => ({
  ...jest.requireActual("expo-crypto"),
  randomUUID: require("node:crypto").randomUUID,
}));

// Native screen metrics have upstream defaults; suites may still supply explicit provider metrics.
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// Use upstream Worklets mocking and Reanimated Jest support for native animation boundaries.
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock"),
);
require("react-native-reanimated").setUpTests();

// Router and pager doubles share the upstream mock through Jest's module boundary.
// Its animated-ref stub is an object; keep the supported callable JS ref for keyboard/scroll bindings.
jest.mock("react-native-reanimated/mock", () => ({
  ...jest.requireActual("react-native-reanimated/mock"),
  useAnimatedRef: jest.requireActual("react-native-reanimated").useAnimatedRef,
}));

// The upstream RefreshControl mock drops all props. Preserve the native event and
// accessibility boundary so tests can exercise the real read owner through refresh.
jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => {
    const React = require("react");
    const View = require("react-native/Libraries/Components/View/View").default;

    /** Projects native refresh inputs without simulating a gesture or a request lifecycle. */
    function RefreshControl(props) {
      return React.createElement(View, props);
    }

    return { __esModule: true, default: RefreshControl };
  },
);

// The application root composes native advertising readiness; SDK I/O remains controlled in Jest.
jest.mock(
  "react-native-google-mobile-ads",
  () =>
    jest.requireActual("@/features/advertising/test-support/native-privacy")
      .nativeAdvertising,
);
jest.mock("@react-native-google-mobile-ads/facebook", () => ({
  setAdvertiserTrackingEnabled: jest.fn(),
}));

// Map construction is native; sporting suites keep real queries and selection with controlled map events.
jest.mock(
  "react-native-maps",
  () =>
    jest.requireActual("@/features/sporting/test-support/native-maps")
      .nativeMaps,
);
jest.mock("expo-tracking-transparency", () => ({
  getTrackingPermissionsAsync: jest.fn(async () => ({
    status: "denied",
    canAskAgain: false,
  })),
  requestTrackingPermissionsAsync: jest.fn(),
}));

// PDF decoding belongs to the native module; lifecycle suites supply controlled native callbacks.
jest.mock("react-native-pdf", () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

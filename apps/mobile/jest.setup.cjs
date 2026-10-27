/* global jest */
// The application root now mounts RNGH; retain the package's native Jest boundary in every root consumer.
require("react-native-gesture-handler/jestSetup");

// Expo's native UUID stub returns undefined; Node supplies the same UUID contract in Jest.
jest.mock("expo-crypto", () => ({
  ...jest.requireActual("expo-crypto"),
  randomUUID: require("node:crypto").randomUUID,
}));

// Native screen metrics have upstream defaults; suites may still supply explicit provider metrics.
jest.mock(
  "react-native-safe-area-context",
  () =>
    jest.requireActual("react-native-safe-area-context/src/jest/mock").default,
);

// Use upstream Worklets mocking and Reanimated Jest support for native animation boundaries.
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock"),
);
require("react-native-reanimated").setUpTests();

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

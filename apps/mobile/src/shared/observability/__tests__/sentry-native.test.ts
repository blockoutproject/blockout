import * as Sentry from "@sentry/react-native";
import { NativeModules } from "react-native";
import { initializeSentry } from "../sentry";

// The SDK is real; only the device bridge is controlled. This proves configuration, not native emission.
jest.mock("react-native", () => {
  const native = jest.requireActual("react-native");
  native.NativeModules.RNSentry = {
    initNativeSdk: jest.fn().mockResolvedValue(true),
    closeNativeSdk: jest.fn().mockResolvedValue(true),
    captureEnvelope: jest.fn().mockResolvedValue(true),
    disableNativeFramesTracking: jest.fn(),
    addBreadcrumb: jest.fn(),
    clearBreadcrumbs: jest.fn(),
  };
  return native;
});

// SDK module loading starts a maintenance interval even when capture is disabled.
// Control only that import-time timer; initialization and flushing use real timers.
jest.mock("@sentry/react-native", () => {
  jest.useFakeTimers();
  const sdk = jest.requireActual("@sentry/react-native");
  jest.clearAllTimers();
  jest.useRealTimers();
  return sdk;
});

const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

afterEach(async () => {
  Sentry.getIsolationScope().clearBreadcrumbs();
  await Sentry.close();
  jest.restoreAllMocks();
  if (originalDsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  else process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
});

it("keeps release capture disabled and discards breadcrumbs before native synchronization", async () => {
  // Given
  jest.replaceProperty(
    globalThis as typeof globalThis & { __DEV__: boolean },
    "__DEV__",
    false,
  );
  process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@example.invalid/1";

  const breadcrumbs = [
    { category: "console", message: "private-provider-body" },
    {
      category: "xhr",
      data: { url: "https://example.invalid?token=harmless-secret" },
    },
    { category: "navigation", data: { to: "/account/private-account" } },
  ];

  // When
  initializeSentry();
  for (const breadcrumb of breadcrumbs) Sentry.addBreadcrumb(breadcrumb);
  Sentry.captureException(new Error("harmless-private-fixture"));
  await Sentry.flush();

  // Then
  expect(Sentry.getIsolationScope().getScopeData().breadcrumbs).toEqual([]);
  expect(NativeModules.RNSentry.addBreadcrumb).not.toHaveBeenCalled();
  expect(NativeModules.RNSentry.initNativeSdk).toHaveBeenCalledWith(
    expect.objectContaining({
      enabled: false,
      enableNativeCrashHandling: true,
      enableNdk: true,
      autoInitializeNativeSdk: true,
      sendDefaultPii: false,
      enableAutoSessionTracking: false,
      enableAppHangTracking: false,
      enableWatchdogTerminationTracking: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableCaptureFailedRequests: false,
      maxBreadcrumbs: 0,
      enableLogs: false,
    }),
  );
  expect(NativeModules.RNSentry.captureEnvelope).not.toHaveBeenCalled();
});

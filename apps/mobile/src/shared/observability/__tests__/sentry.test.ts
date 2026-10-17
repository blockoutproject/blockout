import * as Sentry from "@sentry/react-native";
import type { ErrorEvent } from "@sentry/react-native";
import { initializeSentry } from "../sentry";

jest.mock("@sentry/react-native", () => ({ init: jest.fn() }));

const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

afterEach(() => {
  jest.restoreAllMocks();
  if (originalDsn === undefined) {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  } else {
    process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
  }
});

it.each(["app:///index.android.bundle", "app:///main.jsbundle"])(
  "keeps safe error context for %s",
  async (filename) => {
    // Given
    const event: ErrorEvent = {
      type: undefined,
      event_id: "0123456789abcdef0123456789abcdef",
      platform: "javascript",
      release: "com.blockout.local@0.0.0+1",
      sdk: { name: "sentry.javascript.react-native", version: "7.11.0" },
      message: "private-provider-body",
      user: { email: "private@example.invalid" },
      request: { url: "https://example.invalid/private?token=harmless-secret" },
      tags: { account: "private-account" },
      extra: { authorization: "Bearer harmless-secret" },
      contexts: { account: { email: "private@example.invalid" } },
      breadcrumbs: [{ message: "private-provider-body" }],
      exception: {
        values: [
          {
            type: "TypeError",
            value: "private-provider-body",
            mechanism: {
              type: "onerror",
              handled: false,
              data: { token: "harmless-secret" },
            },
            stacktrace: {
              frames: [
                {
                  filename,
                  lineno: 1,
                  colno: 42,
                  in_app: true,
                  context_line: "private-provider-body",
                  vars: { email: "private@example.invalid" },
                },
                {
                  filename:
                    "https://example.invalid/private-account?token=harmless-secret",
                },
              ],
            },
          },
        ],
      },
      debug_meta: {
        images: [
          {
            type: "sourcemap",
            debug_id: "01234567-89ab-4cde-8123-456789abcdef",
            code_file: filename,
          },
        ],
      },
    };
    initializeSentry();
    const options = jest.mocked(Sentry.init).mock.calls[0][0];

    // When
    const result = await options?.beforeSend?.(event, {});

    // Then
    expect(result).toMatchObject({
      event_id: event.event_id,
      release: event.release,
      sdk: event.sdk,
      exception: {
        values: [
          {
            type: "TypeError",
            mechanism: { type: "onerror", handled: false },
            stacktrace: {
              frames: [
                {
                  filename,
                  lineno: 1,
                  colno: 42,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
      debug_meta: event.debug_meta,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private|harmless-secret|authorization|context_line/,
    );
  },
);

it.each([
  { development: true, enabled: false },
  { development: false, enabled: true },
])(
  "sets reporting to $enabled with development=$development",
  ({ development, enabled }) => {
    // Given
    const dsn = "https://public@example.invalid/1";
    jest.replaceProperty(
      globalThis as typeof globalThis & { __DEV__: boolean },
      "__DEV__",
      development,
    );
    process.env.EXPO_PUBLIC_SENTRY_DSN = dsn;

    // When
    initializeSentry();
    const options = jest.mocked(Sentry.init).mock.calls[0][0];

    // Then
    expect(options).toMatchObject({ dsn, enabled });
  },
);

it.each([
  "app:///index.android.bundle?token=harmless-secret",
  "https://example.invalid/index.android.bundle",
  "file:///private/main.jsbundle",
])(
  "rejects a bundle reference not normalized by the SDK: %s",
  async (filename) => {
    // Given
    initializeSentry();
    const options = jest.mocked(Sentry.init).mock.calls[0][0];
    const event: ErrorEvent = {
      type: undefined,
      exception: {
        values: [{ type: "Error", stacktrace: { frames: [{ filename }] } }],
      },
      debug_meta: {
        images: [
          {
            type: "sourcemap",
            debug_id: "01234567-89ab-4cde-8123-456789abcdef",
            code_file: filename,
          },
        ],
      },
    };

    // When
    const result = await options?.beforeSend?.(event, {});

    // Then
    expect(result).toMatchObject({
      exception: { values: [{ type: "Error", stacktrace: { frames: [] } }] },
      debug_meta: { images: [] },
    });
  },
);

it("keeps standard native initialization with the error-only capture mode", () => {
  // Given
  // Default sampling options would install additional telemetry integrations.

  // When
  initializeSentry();
  const options = jest.mocked(Sentry.init).mock.calls[0][0];

  // Then
  expect(options?.maxBreadcrumbs).toBe(0);
  expect(options?.tracesSampleRate).toBeUndefined();
  expect(options?.profilesSampleRate).toBeUndefined();
  expect(options?.replaysOnErrorSampleRate).toBeUndefined();
  expect(options?.replaysSessionSampleRate).toBeUndefined();
  expect(options?.sendDefaultPii).toBe(false);
  expect(options?.enableLogs).toBe(false);
  expect(options?.autoInitializeNativeSdk).toBeUndefined();
  expect(options?.enableNativeCrashHandling).toBeUndefined();
  expect(options?.enableNdk).toBeUndefined();
  expect(options?.enableAutoSessionTracking).toBe(false);
});

it("drops a free-form message without an exception", async () => {
  // Given
  initializeSentry();
  const options = jest.mocked(Sentry.init).mock.calls[0][0];

  // When
  const result = await options?.beforeSend?.(
    { type: undefined, message: "private-provider-body" },
    {},
  );

  // Then
  expect(result).toBeNull();
});

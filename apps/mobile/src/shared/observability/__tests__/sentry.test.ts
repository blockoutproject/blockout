import * as Sentry from "@sentry/react-native";
import type { ErrorEvent } from "@sentry/react-native";
import { initializeSentry } from "../sentry";

jest.mock("@sentry/react-native", () => ({ init: jest.fn() }));

it("excludes advertising choices, location and private support data from diagnostics", async () => {
  // Given
  initializeSentry();
  const options = jest.mocked(Sentry.init).mock.calls[0][0];
  const privateData = {
    age: 17,
    consent: "synthetic-consent-string",
    adUnitId: "synthetic-ad-unit",
    advertisingId: "synthetic-advertising-id",
    location: { latitude: 48.86, longitude: 2.34 },
    supportContent: "synthetic-private-support",
    providerObject: { receipt: "synthetic-private-provider-object" },
    originalAccountId: "synthetic-original-target",
  };
  const event: ErrorEvent = {
    type: undefined,
    tags: {
      feature: "advertising",
      consent: privateData.consent,
      age: privateData.age,
    },
    extra: privateData,
    contexts: { advertising: privateData, support: privateData },
    breadcrumbs: [{ data: privateData }],
    exception: {
      values: [{ type: "Error", value: JSON.stringify(privateData) }],
    },
  };
  const hint = {
    attachments: [
      { filename: "synthetic-private.png", data: "synthetic-image" },
    ],
  };

  // When
  const result = await options?.beforeSend?.(event, hint);

  // Then
  expect(result?.exception?.values?.[0]?.type).toBe("Error");
  expect(result?.tags).toBeUndefined();
  expect(result?.extra).toBeUndefined();
  expect(result?.contexts).toBeUndefined();
  expect(result?.breadcrumbs).toBeUndefined();
  expect(JSON.stringify(result)).not.toMatch(/synthetic-|"age":|"location":/);
  expect(hint.attachments).toEqual([]);
});

it("retains only finite Pro operation context while stripping raw provider diagnostics", async () => {
  // Given
  initializeSentry();
  const options = jest.mocked(Sentry.init).mock.calls[0][0];
  const event: Sentry.ErrorEvent = {
    type: undefined,
    tags: {
      feature: "pro",
      operation: "association",
      outcome: "failed",
      account: "private-customer",
    },
    exception: { values: [{ type: "Error", value: "private receipt" }] },
  };

  // When
  const result = await options?.beforeSend?.(event, {});
  const rejected = await options?.beforeSend?.(
    {
      ...event,
      tags: {
        feature: "pro",
        operation: "private-customer",
        outcome: "private receipt",
      },
    },
    {},
  );

  // Then
  expect(result?.tags).toEqual({
    feature: "pro",
    operation: "association",
    outcome: "failed",
  });
  expect(rejected?.tags).toBeUndefined();
  expect(JSON.stringify(result)).not.toMatch(/private|receipt|customer/);
});

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
  { development: true, dsn: undefined },
  { development: false, dsn: undefined },
  { development: true, dsn: "https://public@example.invalid/1" },
  { development: false, dsn: "https://public@example.invalid/1" },
])(
  "keeps reporting disabled with development=$development and dsn=$dsn",
  ({ development, dsn }) => {
    // Given
    jest.replaceProperty(
      globalThis as typeof globalThis & { __DEV__: boolean },
      "__DEV__",
      development,
    );
    if (dsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    else process.env.EXPO_PUBLIC_SENTRY_DSN = dsn;

    // When
    initializeSentry();
    const options = jest.mocked(Sentry.init).mock.calls[0][0];

    // Then
    expect(options).toMatchObject({ dsn, enabled: false });
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

it("bounds native capture while preserving SDK-owned crash initialization", () => {
  // Given
  // Default sampling options would install additional telemetry integrations.

  // When
  initializeSentry();
  const options = jest.mocked(Sentry.init).mock.calls[0][0];

  // Then
  expect(options).toMatchObject({
    enabled: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableCaptureFailedRequests: false,
    enableAppHangTracking: false,
    enableWatchdogTerminationTracking: false,
    sendClientReports: false,
  });
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

it("removes attachments carried outside the JavaScript event", async () => {
  // Given
  initializeSentry();
  const options = jest.mocked(Sentry.init).mock.calls[0][0];
  const hint = {
    attachments: [{ filename: "private.txt", data: "private-provider-body" }],
  };

  // When
  const result = await options?.beforeSend?.(
    { type: undefined, exception: { values: [{ type: "Error" }] } },
    hint,
  );

  // Then
  expect(result?.exception?.values?.[0].type).toBe("Error");
  expect(hint.attachments).toEqual([]);
});

it("replaces free-form exception names and mechanisms without losing failure coordinates", async () => {
  // Given
  initializeSentry();
  const options = jest.mocked(Sentry.init).mock.calls[0][0];
  const event: ErrorEvent = {
    type: undefined,
    exception: {
      values: [
        {
          type: "private-provider-body",
          value: "private@example.invalid",
          mechanism: { type: "private-account", handled: false },
          stacktrace: {
            frames: [
              { filename: "app:///main.jsbundle", lineno: 12, colno: 34 },
            ],
          },
        },
      ],
    },
    sdk: {
      name: "sentry.javascript.react-native",
      version: "7.11.0",
      settings: { infer_ip: "never" },
      integrations: ["private-account"],
    },
    debug_meta: {
      images: [
        {
          type: "sourcemap",
          code_file: "app:///main.jsbundle",
          debug_id: "private-provider-body",
        },
      ],
    },
  };

  // When
  const result = await options?.beforeSend?.(event, {});

  // Then
  expect(result?.exception?.values).toEqual([
    {
      type: "Error",
      mechanism: { type: "generic", handled: false },
      stacktrace: {
        frames: [{ filename: "app:///main.jsbundle", lineno: 12, colno: 34 }],
      },
    },
  ]);
  expect(result?.sdk?.settings).toEqual({ infer_ip: "never" });
  expect(result?.debug_meta?.images).toEqual([]);
  expect(JSON.stringify(result)).not.toContain("private");
});

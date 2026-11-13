import * as Sentry from "@sentry/react-native";
import { createStreamContribution } from "../../../../.generated/mobile";
import { initializeSentry } from "@/shared/observability/sentry";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previous = { ...process.env };
const privateContent =
  "https://youtu.be/private?token=synthetic-secret private-reason auth0|private provider-payload";
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  jest.clearAllMocks();
});
afterEach(() => {
  process.env = { ...previous };
});

it("does not send private rejected contribution content to automatic diagnostics", async () => {
  // Given
  mockFetch.mockResolvedValue(
    Response.json(
      {
        type: "urn:blockout:problem:conflict",
        title: "Failure",
        status: 503,
        detail: privateContent,
        instance: privateContent,
        identity: privateContent,
      },
      {
        status: 503,
        headers: { "Content-Type": "application/problem+json" },
      },
    ),
  );

  // When
  const failure = await createStreamContribution(
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    {
      revision: "viewed",
      url: "https://youtu.be/private?token=synthetic-secret",
    },
  ).catch((error: unknown) => error);

  // Then
  expect(failure).toMatchObject({ kind: "http", status: 503 });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(Sentry.captureException).not.toHaveBeenCalled();
});

it("F13 retains diagnostic event correlation and packaged source coordinates while stripping all contribution content", async () => {
  // Given
  initializeSentry();
  const options = jest.mocked(Sentry.init).mock.calls[0][0];
  const event: Sentry.ErrorEvent = {
    type: undefined,
    event_id: "28200000000040008000000000000001",
    request: { url: privateContent, query_string: privateContent },
    user: { id: privateContent },
    extra: { reason: privateContent, account_cleanup: privateContent },
    tags: { feature: "contributions", identity: privateContent },
    breadcrumbs: [{ message: privateContent }],
    exception: {
      values: [
        {
          type: "TypeError",
          value: privateContent,
          stacktrace: {
            frames: [
              { filename: "app:///main.jsbundle", lineno: 28, colno: 2 },
              { filename: privateContent },
            ],
          },
        },
      ],
    },
  };
  const hint = {
    attachments: [{ filename: "private.txt", data: privateContent }],
  };

  // When
  const safe = await options?.beforeSend?.(event, hint);

  // Then
  expect(safe?.event_id).toBe(event.event_id);
  expect(safe?.exception?.values?.[0]).toMatchObject({
    type: "TypeError",
    stacktrace: {
      frames: [{ filename: "app:///main.jsbundle", lineno: 28, colno: 2 }],
    },
  });
  expect(JSON.stringify(safe)).not.toMatch(
    /private|synthetic-secret|account_cleanup|reason|identity|query_string/,
  );
  expect(hint.attachments).toEqual([]);
});

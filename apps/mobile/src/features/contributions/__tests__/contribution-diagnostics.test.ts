import * as Sentry from "@sentry/react-native";
import { createStreamContribution } from "../../../../.generated/mobile";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { initializeSentry } from "../../../shared/observability/sentry";
import { contributionErrorMessage } from "../api/contribution-errors";

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

it.each([
  { status: 403, uncertain: false },
  { status: 409, uncertain: false },
  { status: 422, uncertain: false },
  { status: 500, uncertain: true },
  { status: 503, uncertain: true },
])(
  "keeps HTTP $status distinct from mutation uncertainty without exposing private problem content",
  async ({ status, uncertain }) => {
    // Given
    mockFetch.mockResolvedValue(
      Response.json(
        {
          type: "urn:blockout:problem:conflict",
          title: "Failure",
          status,
          detail: privateContent,
          instance: privateContent,
          identity: privateContent,
        },
        { status, headers: { "Content-Type": "application/problem+json" } },
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
    expect(failure).toBeInstanceOf(ApiError);
    expect(isUncertainMutationFailure(failure)).toBe(uncertain);
    expect(contributionErrorMessage(failure)).toBe(
      status === 409
        ? "La contribution a changé. Vérifiez les données avant une nouvelle action."
        : "La contribution est indisponible. Votre saisie est conservée.",
    );
    expect(contributionErrorMessage(failure)).not.toMatch(
      /synthetic-secret|private-reason|auth0\|private|provider-payload|youtu.be/,
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  },
);

it.each(["network", "schema"] as const)(
  "retains safe %s failure classification without claiming rollback or retrying",
  async (kind) => {
    // Given
    if (kind === "network")
      mockFetch.mockRejectedValue(new TypeError(privateContent));
    else
      mockFetch.mockResolvedValue(
        Response.json({ contribution: privateContent }),
      );

    // When
    const failure = await createStreamContribution(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      { revision: "viewed", url: "https://youtu.be/example" },
    ).catch((error: unknown) => error);

    // Then
    expect(failure).toMatchObject({ kind });
    expect(isUncertainMutationFailure(failure)).toBe(true);
    expect(JSON.stringify(failure)).not.toContain("private");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  },
);

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

import { useLayoutEffect, type PropsWithChildren } from "react";
import { useQueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { createQueryClient } from "@/shared/query/query-client";
import {
  getGetMyAccountQueryKey,
  getGetOwnStreamReportQueryKey,
} from "../../../../.generated/mobile";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "@/features/accounts/test-support/account-feedback-provider";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { matchDetail } from "@/features/sporting/test-support/consultation-data";
import { ReportContributionScreen } from "../screens/report-contribution-screen";

jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    dismissTo: mockDismissTo,
    canGoBack: () => true,
  }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previous = { ...process.env };
const versionId = "00000000-0000-4000-8000-000000000099";
const original = {
  ...matchDetail(),
  streamUrl: "https://youtu.be/viewed",
  streamContributionId: versionId,
};
let detail = original;
let publicClient = createQueryClient();
let client = publicClient;
// Failure presentation is isolated here; native retry defaults have their own Query suite.
publicClient.setQueryDefaults([], { retry: false });
let posts: { url: string; body: unknown }[] = [];
let ownState = false;
let responseStatus = 201;
let reportReadStatus = 200;

beforeEach(() => {
  publicClient = createQueryClient();
  client = publicClient;
  // Failure presentation is isolated here; native retry defaults have their own Query suite.
  publicClient.setQueryDefaults([], { retry: false });
  detail = original;
  posts = [];
  ownState = false;
  responseStatus = 201;
  reportReadStatus = 200;
  mockPush.mockReset();
  mockBack.mockReset();
  mockDismissTo.mockReset();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    if (path.endsWith("/me")) {
      return Response.json(accountResponse());
    }
    if (path.endsWith("/report")) {
      if (init?.method === "GET" && reportReadStatus >= 400) {
        return Response.json(
          { status: reportReadStatus, title: "Unavailable" },
          { status: reportReadStatus },
        );
      }
      if (init?.method === "POST") {
        posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
        if (responseStatus >= 400) {
          return Response.json(
            {
              type: "urn:blockout:problem:conflict",
              title: "Refused",
              status: responseStatus,
            },
            { status: responseStatus },
          );
        }
        ownState = true;
      }
      return Response.json(
        { reported: ownState },
        { status: init?.method === "POST" ? responseStatus : 200 },
      );
    }
    return Response.json(detail);
  });
});
afterEach(async () => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => {
    await client.cancelQueries();
  });
  await cleanup();
  client.clear();
  publicClient.clear();
  process.env = { ...previous };
  jest.restoreAllMocks();
});

/** Real form, generated transport, Query and F05/F12 providers; HTTP and native SDK/navigation are controlled. */
async function mount() {
  await render(
    <QueryClientProvider client={publicClient}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <PrivateQueries>
              <AccountFeedbackProvider>
                <ReportContributionScreen
                  matchId={detail.match.id}
                  contributionId={versionId}
                  contributionUrl={original.streamUrl}
                />
                <SessionExit />
              </AccountFeedbackProvider>
            </PrivateQueries>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** Exercises real session invalidation while an exact-version report is pending. */
function SessionExit() {
  const session = useAccountSession();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quitter la session"
      onPress={() => void session.clearCredentials()}
    >
      <Text>Quitter</Text>
    </Pressable>
  );
}

it("validates a nonempty reason before any report", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByLabelText("Motif du signalement");

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText("Indiquez le motif du signalement."),
  ).toBeOnTheScreen();
  expect(posts).toHaveLength(0);
});

it("sends only a trimmed reason to the exact version and acknowledges independently of refresh failure", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "  Motif privé  ",
  );
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).includes("/matches/")) {
      throw new TypeError("Controlled read failure");
    }
    if (!peer) {
      throw new Error("Missing HTTP boundary");
    }
    return peer(url, init);
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText("Votre signalement a été envoyé."),
  ).toBeOnTheScreen();
  expect(posts).toEqual([
    {
      url: expect.stringContaining(`/stream-contributions/${versionId}/report`),
      body: { reason: "Motif privé" },
    },
  ]);
  expect(screen.queryByLabelText("Motif du signalement")).not.toBeOnTheScreen();
});

it("retains the reason after a confirmed refusal", async () => {
  // Given
  responseStatus = 422;
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Mon motif",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Le signalement a été refusé. Votre saisie est conservée.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Mon motif")).toBeOnTheScreen();
});

it("keeps an obsolete report as an ordinary error without a refresh state or retargeting", async () => {
  // Given
  responseStatus = 409;
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Version vue",
  );
  detail = {
    ...original,
    streamUrl: "https://youtu.be/new",
    streamContributionId: "00000000-0000-4000-8000-000000000098",
  };

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Version vue")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Actualiser le match" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText(/Le lien a changé/)).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeEnabled();
  expect(posts).toHaveLength(1);

  // When: a later explicit retry retains the original version and never reports the replacement.
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(posts).toHaveLength(2);
  expect(posts.every((post) => post.url.includes(versionId))).toBe(true);
  expect(
    posts.every(
      (post) =>
        JSON.stringify(post.body) === JSON.stringify({ reason: "Version vue" }),
    ),
  ).toBe(true);
});

it("suppresses duplicate presses while the report is pending", async () => {
  // Given
  const deferred = Promise.withResolvers<Response>();
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation(async (url, init) => {
    if (init?.method === "POST") {
      posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return deferred.promise;
    }
    if (!peer) {
      throw new Error("Missing HTTP boundary");
    }
    return peer(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Motif",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(posts).toHaveLength(1);
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeDisabled();
  await act(async () =>
    deferred.resolve(Response.json({ reported: true }, { status: 201 })),
  );
});

it("reads only existing report state without exposing a reason or offering a second send", async () => {
  // Given
  ownState = true;

  // When
  await mount();

  // Then
  expect(
    await screen.findByText("Vous avez déjà signalé ce lien."),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Envoyer le signalement" }),
  ).not.toBeOnTheScreen();
  expect(posts).toHaveLength(0);
});

it("invites a guest without a deferred report", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/sign-in-invitation",
    params: { reason: "stream-report" },
  });
  expect(posts).toHaveLength(0);
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).endsWith("/report")),
  ).toBe(false);
});

it.each(["initialization", "restoration"] as const)(
  "recovers a failed %s before admitting the disabled profile and report reads",
  async (stage) => {
    // Given
    if (stage === "initialization") {
      jest
        .mocked(initializeV2Installation)
        .mockRejectedValueOnce(new Error("Unavailable"));
    } else {
      mockAuth0.getCredentials.mockRejectedValueOnce(new Error("Unavailable"));
    }
    const user = userEvent.setup();

    // When
    await mount();

    // Then
    expect(
      await screen.findByRole("alert", { name: "Une erreur est survenue" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.some(([url]) => String(url).endsWith("/report")),
    ).toBe(false);
    expect(posts).toHaveLength(0);

    // When
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(
      await screen.findByLabelText("Motif du signalement"),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(posts).toHaveLength(0);
  },
);

it("presents the current account read failure while the first report read is still pending", async () => {
  // Given
  const reportRead = Promise.withResolvers<Response>();
  const peer = mockFetch.getMockImplementation();
  let profileUnavailable = false;
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).endsWith("/report")) {
      return reportRead.promise;
    }
    if (String(url).endsWith("/me") && profileUnavailable) {
      throw new TypeError("Unavailable");
    }
    if (!peer) {
      throw new Error("Missing HTTP boundary");
    }
    return peer(url, init);
  });
  await mount();
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([url]) => String(url).endsWith("/report")),
    ).toBe(true),
  );

  try {
    // When
    profileUnavailable = true;
    await act(() =>
      client.refetchQueries({
        queryKey: getGetMyAccountQueryKey(),
        exact: true,
      }),
    );

    // Then
    expect(
      await screen.findByRole("button", { name: "Réessayer" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByLabelText("Motif du signalement"),
    ).not.toBeOnTheScreen();
    expect(posts).toHaveLength(0);
  } finally {
    // When: only the original prerequisite read settles; no account reread is required.
    await act(async () =>
      reportRead.resolve(Response.json({ reported: false })),
    );
  }

  // Then
  expect(
    await screen.findByLabelText("Motif du signalement"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeEnabled();
  expect(posts).toHaveLength(0);
});

it("keeps revoked report authority withdrawn through a technical retry and restores the same reason only on success", async () => {
  // Given: real Query and RHF owners; the private report read alone is controlled.
  const reportKey = [
    ...getGetOwnStreamReportQueryKey(accountResponse().accountId, versionId),
    "ordinary",
  ];
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Retained private reason",
  );
  reportReadStatus = 403;

  // When
  await act(() => client.refetchQueries({ queryKey: reportKey, exact: true }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Envoyer le signalement" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("Motif du signalement")).not.toBeOnTheScreen();
  expect(client.getQueryData(reportKey)).toBeNull();

  // When: the current failure changes without returning the refused private data.
  reportReadStatus = 503;
  const beforeRetry = mockFetch.mock.calls.length;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await waitFor(() =>
    expect(client.getQueryState(reportKey)?.error).toMatchObject({
      status: 503,
    }),
  );

  // Then
  expect(client.getQueryData(reportKey)).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Envoyer le signalement" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByDisplayValue("Retained private reason"),
  ).not.toBeOnTheScreen();
  const retryRequests = mockFetch.mock.calls
    .slice(beforeRetry)
    .map(([url, init]) => ({ url: String(url), method: init?.method }));
  expect(retryRequests.filter(({ url }) => url.endsWith("/report"))).toEqual([
    {
      url: expect.stringContaining(
        `/accounts/${accountResponse().accountId}/stream-contributions/${versionId}/report`,
      ),
      method: "GET",
    },
  ]);
  expect(retryRequests.every(({ method }) => method === "GET")).toBe(true);
  expect(posts).toHaveLength(0);

  // When
  reportReadStatus = 200;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then: the mounted RHF owner still holds this account/version's exact draft.
  expect(
    await screen.findByDisplayValue("Retained private reason"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeEnabled();
  expect(posts).toHaveLength(0);
});

it("keeps an acknowledged report accepted when a refused derivative read withdraws its cache", async () => {
  // Given
  const reportKey = [
    ...getGetOwnStreamReportQueryKey(accountResponse().accountId, versionId),
    "ordinary",
  ];
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Accepted private reason",
  );
  reportReadStatus = 403;

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText("Votre signalement a été envoyé."),
  ).toBeOnTheScreen();
  await waitFor(() => expect(client.getQueryData(reportKey)).toBeNull());
  expect(
    screen.queryByRole("button", { name: "Envoyer le signalement" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("Motif du signalement")).not.toBeOnTheScreen();

  // When
  reportReadStatus = 503;
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));
  await waitFor(() =>
    expect(client.getQueryState(reportKey)?.error).toMatchObject({
      status: 503,
    }),
  );

  // Then
  expect(screen.getByText("Votre signalement a été envoyé.")).toBeOnTheScreen();
  expect(client.getQueryData(reportKey)).toBeNull();
  expect(posts).toHaveLength(1);
});

it("cancels without sending a report", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByLabelText("Motif du signalement");

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));

  // Then
  expect(mockDismissTo).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: detail.match.id },
  });
  expect(posts).toHaveLength(0);
});

it.each(["session", "departure"])(
  "ignores a late report acknowledgement after %s",
  async (end) => {
    // Given
    const deferred = Promise.withResolvers<Response>();
    const peer = mockFetch.getMockImplementation();
    mockFetch.mockImplementation(async (url, init) => {
      if (init?.method === "POST") {
        posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
        return deferred.promise;
      }
      if (!peer) {
        throw new Error("Missing HTTP boundary");
      }
      return peer(url, init);
    });
    const user = userEvent.setup();
    await mount();
    await user.type(
      await screen.findByLabelText("Motif du signalement"),
      "Motif",
    );
    await user.press(
      screen.getByRole("button", { name: "Envoyer le signalement" }),
    );

    // When
    if (end === "session") {
      await user.press(
        screen.getByRole("button", { name: "Quitter la session" }),
      );
    } else {
      await cleanup();
    }
    await act(async () =>
      deferred.resolve(Response.json({ reported: true }, { status: 201 })),
    );

    // Then
    if (end === "session") {
      expect(
        screen.queryByText("Votre signalement a été envoyé."),
      ).not.toBeOnTheScreen();
    }
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(posts).toHaveLength(1);
  },
);

it("uses ordinary error feedback for an invalid acknowledgement without automatic replay", async () => {
  // Given
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation(async (url, init) => {
    if (init?.method === "POST") {
      posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return Response.json({ reported: "yes" });
    }
    if (!peer) {
      throw new Error("Missing HTTP boundary");
    }
    return peer(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Motif",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Motif")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeEnabled();
  expect(posts).toHaveLength(1);
});

it("keeps the viewed address when current public context already contains a replacement", async () => {
  // Given
  detail = {
    ...original,
    streamUrl: "https://youtu.be/replacement",
    streamContributionId: "00000000-0000-4000-8000-000000000098",
  };
  responseStatus = 409;
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Lien vu",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(screen.getByText(original.streamUrl)).toBeOnTheScreen();
  expect(screen.queryByText(detail.streamUrl)).not.toBeOnTheScreen();
  expect(posts).toHaveLength(1);
  expect(posts[0].url).toContain(versionId);
});

/** Captures the identity-owned private cache while retaining the public cache for fixture cleanup. */
function PrivateQueries({ children }: Readonly<PropsWithChildren>) {
  const privateClient = useQueryClient();
  // Configure deterministic failure presentation before child Query observers mount.
  privateClient.setQueryDefaults([], { retry: false, gcTime: Infinity });
  privateClient.setMutationDefaults([], { gcTime: Infinity });
  useLayoutEffect(() => {
    client = privateClient;
  }, [privateClient]);
  return children;
}

import { QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import {
  MatchContributionAction,
  useMatchContributionAction,
} from "../../sporting/components/sporting-actions";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import { ownContributions } from "../test-support/contribution-data";
import { MatchScreen } from "../../sporting/screens/match-screen";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import * as proSessionModule from "../../pro/pro-session";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
}));

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ isFocused: () => true }),
}));
const mockPush = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previous = { ...process.env };
/** Uses the actual public action and its read owner, as the match refresh composition does. */
function Entry({ header = false }: { header?: boolean }) {
  const entry = useMatchContributionAction(
    "00000000-0000-4000-8000-000000000002",
  );
  return <MatchContributionAction entry={entry} header={header} />;
}
let client = createQueryClient();
let context = ownContributions();
beforeEach(() => {
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  client = createQueryClient();
  mockPush.mockReset();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  context = ownContributions();
  mockFetch.mockReset().mockImplementation(async (url) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/application-access"))
      return Response.json(applicationAccessResponse());
    if (path.endsWith("/me")) return Response.json(accountResponse());
    return Response.json(
      path.includes("/stream-contributions") ? context : matchDetail(),
    );
  });
});

it.each(["refused", "owner outage", "profile outage"])(
  "offers the action after match refresh recovers from %s",
  async (initial) => {
    // Given: an initially unavailable action on the real match screen and Query owners.
    context = ownContributions({
      eligibility: {
        canSubmit: false,
        requiresApproval: false,
        reason: "Le compte doit avoir au moins sept jours.",
      },
    });
    let recovering = false;
    const peer = mockFetch.getMockImplementation();
    mockFetch.mockImplementation(async (url, init) => {
      if (
        !recovering &&
        ((initial === "owner outage" &&
          String(url).includes("/stream-contributions")) ||
          (initial === "profile outage" && String(url).endsWith("/me")))
      )
        throw new TypeError("Controlled test network failure");
      if (!peer) throw new Error("Missing test HTTP boundary");
      return peer(url, init);
    });
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>
                <AdvertisingProviders>
                  <MatchScreen matchId={matchDetail().match.id} />
                </AdvertisingProviders>
              </AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          initial === "profile outage" ? "/me" : "/stream-contributions",
        ),
        expect.anything(),
      ),
    );
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(
      screen.queryByRole("button", { name: "Proposer un lien" }),
    ).not.toBeOnTheScreen();

    // When: time-dependent eligibility changes and the user refreshes the match itself.
    recovering = true;
    context = ownContributions();
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then: the same entry becomes usable without remount, polling or a separate permission flow.
    expect(
      await screen.findByRole("button", { name: "Proposer un lien" }),
    ).toBeOnTheScreen();
  },
);
afterEach(async () => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => {
    await client.cancelQueries();
  });
  await cleanup();
  client.clear();
  process.env = { ...previous };
  jest.restoreAllMocks();
});

it.each([false, true])(
  "keeps only an available public Stream link card when personal access is unavailable and URL=%s",
  async (published) => {
    // Given
    context = ownContributions({
      eligibility: { canSubmit: false, requiresApproval: false },
    });
    const boundary = mockFetch.getMockImplementation();
    if (!boundary) throw new Error("Missing test HTTP boundary");
    const detail = matchDetail();
    mockFetch.mockImplementation((url, init) => {
      if (new URL(String(url)).pathname === `/matches/${detail.match.id}`)
        return Promise.resolve(
          Response.json({
            ...detail,
            ...(published
              ? { streamUrl: "https://video.example.invalid/live" }
              : {}),
          }),
        );
      return boundary(url, init);
    });

    // When
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>
                <AdvertisingProviders>
                  <MatchScreen matchId={detail.match.id} />
                </AdvertisingProviders>
              </AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await screen.findByText("Home");
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(!!screen.queryByRole("header", { name: "Stream link" })).toBe(
      published,
    );
    expect(!!screen.queryByRole("link", { name: "Ouvrir le lien" })).toBe(
      published,
    );
    expect(
      screen.queryByRole("button", { name: "Proposer un lien" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText("Aucun lien disponible pour ce match."),
    ).not.toBeOnTheScreen();
  },
);

it.each([true, false])(
  "opens the proposal form or existing invitation for authenticated=%s",
  async (authenticated) => {
    // Given: the real session and eligibility owners; neither Pro nor support controls the entry.
    mockAuth0.hasValidCredentials.mockResolvedValue(authenticated);
    const user = userEvent.setup();
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <AccountSessionProvider>
            <ApplicationAccessProvider>
              <Entry />
            </ApplicationAccessProvider>
          </AccountSessionProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // When
    await user.press(
      await screen.findByRole("button", { name: "Proposer un lien" }),
    );

    // Then
    expect(mockPush).toHaveBeenCalledWith(
      authenticated
        ? {
            pathname: "/matches/[matchId]/contribution",
            params: { matchId: "00000000-0000-4000-8000-000000000002" },
          }
        : {
            pathname: "/sign-in-invitation",
            params: { reason: "contribution" },
          },
    );
    expect(screen.queryByText(/replay/i)).not.toBeOnTheScreen();
    expect(screen.queryByText(/support/i)).not.toBeOnTheScreen();
  },
);

it.each([
  "Le compte doit avoir au moins sept jours.",
  "L’ancienneté du compte est indisponible. Réessayez.",
  "La publication ouvre une heure avant le match.",
])("omits an unavailable contribution action: %s", async (reason) => {
  // Given: the generated owner response supplies current eligibility, including the account-age rule.
  context = ownContributions({
    eligibility: { canSubmit: false, requiresApproval: false, reason },
  });
  const response = Promise.withResolvers<Response>();
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation((url, init) => {
    if (String(url).includes("/stream-contributions")) return response.promise;
    if (!peer) throw new Error("Missing test HTTP boundary");
    return peer(url, init);
  });
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AccountSessionProvider>
          <ApplicationAccessProvider>
            <Entry />
          </ApplicationAccessProvider>
        </AccountSessionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  // When: the real Query and generated transport finish the eligibility read.
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/stream-contributions"),
      expect.anything(),
    ),
  );
  await act(async () => {
    response.resolve(Response.json(context));
  });
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then: there is no disabled action, refusal copy, or navigation to an unusable form.
  expect(
    screen.queryByRole("button", { name: "Proposer un lien" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText(reason)).not.toBeOnTheScreen();
  expect(mockPush).not.toHaveBeenCalled();
});

it("keeps personal proposals reachable when new submissions are unavailable", async () => {
  // Given
  context = ownContributions({
    eligibility: { canSubmit: false, requiresApproval: false },
    proposalCount: 1,
    items: [
      {
        id: "00000000-0000-4000-8000-000000000003",
        url: "https://youtu.be/history",
        platform: "youtube",
        state: "pending",
        submittedAt: "2026-10-28T10:00:00Z",
        canCancel: true,
        canWithdraw: false,
      },
    ],
  });
  const user = userEvent.setup();
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <Entry header />
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  // When
  await user.press(
    await screen.findByRole("button", { name: "Gérer mes propositions" }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]/contributions",
    params: { matchId: "00000000-0000-4000-8000-000000000002" },
  });
  expect(
    screen.queryByRole("button", { name: "Stream link" }),
  ).not.toBeOnTheScreen();
});

it.each(["exact owner", "different owner", "missing projection"] as const)(
  "selects the public action from the independent active identity: %s",
  async (ownership) => {
    // Given: twenty newer personal versions do not contain the currently published version.
    const publicId = "00000000-0000-4000-8000-000000000099";
    const active = {
      id:
        ownership === "different owner"
          ? "00000000-0000-4000-8000-000000000098"
          : publicId,
      url: "https://youtu.be/published",
      platform: "youtube" as const,
      state: "active" as const,
      submittedAt: "2026-10-01T10:00:00Z",
      canCancel: false,
      canWithdraw: true,
    };
    context = ownContributions({
      proposalCount: 21,
      nextPage: 1,
      eligibility: { canSubmit: false, requiresApproval: false },
      activeContribution:
        ownership === "missing projection" ? undefined : active,
      items: Array.from({ length: 20 }, (_, index) =>
        ownership === "missing projection" && index === 0
          ? active
          : {
              ...active,
              id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
              state: "withdrawn" as const,
              canWithdraw: false,
            },
      ),
    });
    const detail = matchDetail();
    const boundary = mockFetch.getMockImplementation();
    mockFetch.mockImplementation((url, init) => {
      if (new URL(String(url)).pathname === `/matches/${detail.match.id}`)
        return Promise.resolve(
          Response.json({
            ...detail,
            streamUrl: active.url,
            streamContributionId: publicId,
          }),
        );
      if (!boundary) throw new Error("Missing test HTTP boundary");
      return boundary(url, init);
    });
    const user = userEvent.setup();
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>
                <AdvertisingProviders>
                  <MatchScreen matchId={detail.match.id} />
                </AdvertisingProviders>
              </AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await screen.findByText("Home");
    await waitFor(() => expect(client.isFetching()).toBe(0));

    const entry = await screen.findByRole("button", {
      name:
        ownership === "exact owner"
          ? "Modifier le lien"
          : "Gérer mes propositions",
    });

    // Then
    expect(!!screen.queryByRole("button", { name: "Modifier le lien" })).toBe(
      ownership === "exact owner",
    );
    expect(!!screen.queryByRole("link", { name: "Ouvrir le lien" })).toBe(
      ownership !== "exact owner",
    );
    expect(
      screen.queryByRole("button", { name: "Proposer un lien" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("Signaler")).not.toBeOnTheScreen();

    // When
    await user.press(entry);

    // Then
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/matches/[matchId]/contributions",
      params: { matchId: detail.match.id },
    });
    expect(
      mockFetch.mock.calls.some(
        ([, init]) => init?.method === "POST" || init?.method === "PATCH",
      ),
    ).toBe(false);
  },
);

it.each(["own", "other", "failure"] as const)(
  "waits for private ownership before exposing a contributed public action: %s",
  async (outcome) => {
    // Given: F03 already has the public URL while the original-account read remains in flight.
    const detail = matchDetail();
    const publicId = "00000000-0000-4000-8000-000000000099";
    const active = {
      id: publicId,
      url: "https://youtu.be/public-before-private",
      platform: "youtube" as const,
      state: "active" as const,
      submittedAt: "2026-10-01T10:00:00Z",
      canCancel: false,
      canWithdraw: true,
    };
    context = ownContributions(
      outcome === "other"
        ? {}
        : { proposalCount: 1, activeContribution: active },
    );
    const delayed = Promise.withResolvers<Response>();
    const boundary = mockFetch.getMockImplementation();
    let firstRead = true;
    mockFetch.mockImplementation((url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === `/matches/${detail.match.id}`)
        return Promise.resolve(
          Response.json({
            ...detail,
            streamUrl: active.url,
            streamContributionId: publicId,
          }),
        );
      if (path.includes("/stream-contributions") && firstRead) {
        firstRead = false;
        return delayed.promise;
      }
      if (!boundary) throw new Error("Missing test HTTP boundary");
      return boundary(url, init);
    });
    const user = userEvent.setup();
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>
                <AdvertisingProviders>
                  <MatchScreen matchId={detail.match.id} />
                </AdvertisingProviders>
              </AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await screen.findByRole("header", { name: "Stream link" });
    await waitFor(() => expect(firstRead).toBe(false));

    // Then: the published URL alone cannot expose the foreign-owner F11 action.
    expect(
      screen.queryByRole("link", { name: "Ouvrir le lien" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Modifier le lien" }),
    ).not.toBeOnTheScreen();

    // When
    await act(async () =>
      delayed.resolve(
        outcome === "failure"
          ? Response.json({ status: 500 }, { status: 500 })
          : Response.json(context),
      ),
    );

    // Then
    if (outcome === "failure") {
      expect(
        await screen.findByRole("button", { name: "Réessayer" }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole("progressbar", { name: "Chargement en cours" }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByRole("link", { name: "Ouvrir le lien" }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Modifier le lien" }),
      ).not.toBeOnTheScreen();

      // When: the existing read-only retry establishes current ownership.
      await user.press(screen.getByRole("button", { name: "Réessayer" }));
    }

    // Then
    expect(
      await screen.findByRole(outcome === "other" ? "link" : "button", {
        name: outcome === "other" ? "Ouvrir le lien" : "Modifier le lien",
      }),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.some(
        ([, init]) => init?.method === "POST" || init?.method === "PATCH",
      ),
    ).toBe(false);
  },
);

it.each(["guest", "professional"] as const)(
  "keeps the public opening independent of private ownership for %s",
  async (source) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(source !== "guest");
    const detail = matchDetail();
    const delayed = Promise.withResolvers<Response>();
    const boundary = mockFetch.getMockImplementation();
    let privateReads = 0;
    mockFetch.mockImplementation((url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === `/matches/${detail.match.id}`)
        return Promise.resolve(
          Response.json({
            ...detail,
            streamUrl: "https://youtu.be/public",
            ...(source === "guest"
              ? { streamContributionId: "00000000-0000-4000-8000-000000000099" }
              : {}),
          }),
        );
      if (path.includes("/stream-contributions")) {
        privateReads++;
        return delayed.promise;
      }
      if (!boundary) throw new Error("Missing test HTTP boundary");
      return boundary(url, init);
    });

    // When
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>
                <AdvertisingProviders>
                  <MatchScreen matchId={detail.match.id} />
                </AdvertisingProviders>
              </AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // Then
    try {
      expect(
        await screen.findByRole("link", { name: "Ouvrir le lien" }),
      ).toBeOnTheScreen();
      if (source === "professional")
        await waitFor(() => expect(privateReads).toBe(1));
      else expect(privateReads).toBe(0);
      expect(
        screen.getByRole("link", { name: "Ouvrir le lien" }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Modifier le lien" }),
      ).not.toBeOnTheScreen();
    } finally {
      await act(async () => delayed.resolve(Response.json(context)));
    }
  },
);

it.each([
  {
    condition: "failed native restoration",
    failure: new Error("Synthetic restoration unavailable"),
  },
  {
    condition: "expired credentials",
    failure: {
      code: "invalid_grant",
      message: "Synthetic expired credentials",
    },
  },
])(
  "preserves public contributed-link consultation after $condition",
  async ({ failure }) => {
    // Given: the real F05 SDK boundary cannot establish an authenticated private context.
    mockAuth0.getCredentials.mockRejectedValue(failure);
    const detail = matchDetail();
    const boundary = mockFetch.getMockImplementation();
    mockFetch.mockImplementation((url, init) => {
      if (new URL(String(url)).pathname === `/matches/${detail.match.id}`)
        return Promise.resolve(
          Response.json({
            ...detail,
            streamUrl: "https://youtu.be/public",
            streamContributionId: "00000000-0000-4000-8000-000000000099",
          }),
        );
      if (!boundary) throw new Error("Missing test HTTP boundary");
      return boundary(url, init);
    });

    // When
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>
                <AdvertisingProviders>
                  <MatchScreen matchId={detail.match.id} />
                </AdvertisingProviders>
              </AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // Then
    expect(
      await screen.findByRole("link", { name: "Ouvrir le lien" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Modifier le lien" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Proposer un lien" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Gérer mes propositions" }),
    ).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).includes("/stream-contributions"),
      ),
    ).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();
  },
);

it("routes the viewed contributed version to reporting independently of support", async () => {
  // Given
  const detail = {
    ...matchDetail(),
    streamUrl: "https://youtu.be/viewed",
    streamContributionId: "00000000-0000-4000-8000-000000000099",
  };
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).endsWith(`/matches/${detail.match.id}`))
      return Response.json(detail);
    if (!peer) throw new Error("Missing HTTP boundary");
    return peer(url, init);
  });
  const user = userEvent.setup();
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <AdvertisingProviders>
                <MatchScreen matchId={detail.match.id} />
              </AdvertisingProviders>
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  // When
  await user.press(
    await screen.findByRole("button", { name: "Signaler le lien" }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]/report-contribution",
    params: {
      matchId: detail.match.id,
      contributionId: detail.streamContributionId,
    },
  });
});

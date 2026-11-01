import {
  useLayoutEffect,
  type PropsWithChildren,
  useEffect,
  type ReactNode,
  type ReactElement,
} from "react";
import { useQueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import "../../../shared/native/test-support/tab-view-native";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getGetMyAccountQueryKey } from "../../../../.generated/mobile";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  ApplicationAccessProvider,
  useApplicationAccess,
} from "../../access/queries/use-application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import type { AccountSession } from "../../accounts";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { FollowButton } from "../components/follow-button";
import TeamRoute from "../../../app/(ordinary)/teams/[teamId]";
import PoolRoute from "../../../app/(ordinary)/pools/[poolId]";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import {
  followStateKey,
  followListKey,
  personalCalendarKey,
  followOptionsKey,
  followerCountKey,
} from "../api/following-keys";

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
  useLocalSearchParams: () => mockRouteParams,
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: string, request?: RequestInit) => mockFetch(url, request),
}));
const mockPush = jest.fn();
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const accountId = "00000000-0000-4000-8000-000000000001";
const team = {
  type: "team",
  id: "00000000-0000-4000-8000-000000000002",
} as const;
const pool = { type: "pool", id: team.id } as const;
const mockRouteParams = { teamId: team.id, poolId: pool.id };
const season = {
  id: "00000000-0000-4000-8000-000000000003",
  label: "2026/2027",
  startYear: 2026,
};
const profile = {
  accountId,
  username: "Demo",
  email: "demo@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: {
    manageMaintenance: false,
    manageApplicationVersions: false,
    bypassMaintenance: false,
    manageSportingPresentation: false,
    manageSportingClassification: false,
    manageDivisionLifecycle: false,
    manageCollection: false,
    moderateStreamLinks: false,
  },
};
const mockFollowStates = new Map<string, boolean>();
let publicClient = createQueryClient();
let client = publicClient;
// Failure presentation is isolated here; native retry defaults have their own Query suite.
client.setQueryDefaults([], { retry: false });
let session: AccountSession;
let access: ReturnType<typeof useApplicationAccess>;
const environment = { ...process.env };

/** Captures the real session API; private query cleanup is the same root-owned binding as production. */
function SessionProbe({ children }: { children: ReactNode }) {
  const current = useAccountSession();
  const currentAccess = useApplicationAccess();
  useEffect(() => {
    session = current;
    access = currentAccess;
  }, [current, currentAccess]);
  return children;
}

/** Real gesture, Query, theme, F12 and F05 providers; native I/O, route focus, viewport and HTTP are controlled. */
async function renderFollowing(children: ReactElement) {
  return render(children, {
    wrapper: ({ children }) => (
      <GestureHandlerRootView>
        <QueryClientProvider client={publicClient}>
          <ThemeProvider>
            <ApplicationAccessProvider>
              <AccountSessionProvider>
                <PrivateQueries>
                  <AccountFeedbackProvider>
                    <SessionProbe>{children}</SessionProbe>
                  </AccountFeedbackProvider>
                </PrivateQueries>
              </AccountSessionProvider>
            </ApplicationAccessProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    ),
  });
}

/** Default synthetic transport uses the actual generated validation and explicit member replacement. */
async function transport(url: string, request?: RequestInit) {
  if (url.endsWith("/application-access"))
    return Response.json(applicationAccessResponse());
  if (url.endsWith("/accounts/me")) return Response.json(profile);
  if (request?.method === "PUT") {
    const state = JSON.parse(String(request.body));
    mockFollowStates.set(url, state.following);
    return Response.json(state);
  }
  return Response.json({ following: mockFollowStates.get(url) ?? false });
}

beforeEach(() => {
  mockFollowStates.clear();
  publicClient = createQueryClient();
  client = publicClient;
  // Failure presentation is isolated here; native retry defaults have their own Query suite.
  client.setQueryDefaults([], { retry: false });
  // TanStack's documented Jest setting avoids waiting for inactive-cache collection timers.
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
    mutations: { ...client.getDefaultOptions().mutations, gcTime: Infinity },
  });
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "test-client",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|demo"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(transport);
  mockPush.mockReset();
});
afterEach(async () => {
  await cleanup();
  client.clear();
  publicClient.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it("owns pending UI per control and refreshes other controls from the server", async () => {
  // Given
  const response = Promise.withResolvers<void>();
  mockFetch.mockImplementation((url, request) =>
    request?.method === "PUT" && url.includes("team-follows")
      ? response.promise.then(() => {
          mockFollowStates.set(url, true);
          return Response.json({ following: true });
        })
      : transport(url, request),
  );
  const user = userEvent.setup();
  await renderFollowing(
    <>
      <FollowButton target={team} season={season} />
      <FollowButton target={team} season={season} />
      <FollowButton target={pool} season={season} />
    </>,
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Suivre", disabled: false }),
    ).toHaveLength(3),
  );
  // When
  await user.press(screen.getAllByRole("button", { name: "Suivre" })[0]);
  // Then
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Suivi", busy: true }),
    ).toHaveLength(1),
  );
  expect(
    screen.getAllByRole("button", { name: "Suivre", disabled: false }),
  ).toHaveLength(2);
  // When
  await user.press(screen.getAllByRole("button", { name: "Suivre" })[0]);
  await act(async () => response.resolve());
  // Then
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Suivi", busy: false }),
    ).toHaveLength(2),
  );
  expect(
    mockFetch.mock.calls.filter(
      ([url, request]) =>
        url.includes("team-follows") && request?.method === "PUT",
    ),
  ).toHaveLength(2);
});

it("invites a guest without retaining a command to replay after authentication", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  const user = userEvent.setup();
  await renderFollowing(<FollowButton target={team} season={season} />);
  await waitFor(() => expect(session.status).toBe("guest"));

  // When
  await user.press(await screen.findByRole("button", { name: "Suivre" }));

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/sign-in-invitation",
    params: { reason: "follow" },
  });
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PUT"),
  ).toHaveLength(0);
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|demo"));
  mockAuth0.saveCredentials.mockResolvedValue();
  // When
  await act(async () => {
    await session.signIn("https://api.example.invalid");
  });
  // Then
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PUT"),
  ).toHaveLength(0);
});

it("suspends the action after profile retrieval fails while public content remains usable", async () => {
  // Given
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/accounts/me")
      ? Promise.resolve(new Response(null, { status: 503 }))
      : transport(url, request),
  );
  await renderFollowing(
    <>
      <Text>Public sport</Text>
      <FollowButton target={team} season={season} />
    </>,
  );
  await waitFor(() => expect(session.status).toBe("authenticated"));

  // When
  await screen.findByText("Une erreur est survenue");

  // Then
  expect(screen.getByText("Public sport")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Suivre" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.filter(([url]) => url.includes("team-follows")),
  ).toHaveLength(0);
});

it.each(["team", "pool"] as const)(
  "composes the %s route with its exact target and sporting season",
  async (type) => {
    // Given
    const publicPool = {
      ...matchDetail().match.pool,
      pool: { id: pool.id, name: "Phase 01" },
      season,
    };
    mockFetch.mockImplementation((url, request) => {
      if (url.endsWith(`/teams/${team.id}`))
        return Promise.resolve(
          Response.json({
            team: {
              team: { id: team.id, name: "Volley Démo" },
              season,
              classification: {},
              professional: true,
            },
            participations: [],
          }),
        );
      if (url.endsWith(`/pools/${pool.id}`))
        return Promise.resolve(Response.json({ pool: publicPool }));
      return transport(url, request);
    });
    const user = userEvent.setup();
    await renderFollowing(type === "team" ? <TeamRoute /> : <PoolRoute />);
    await waitFor(() => expect(session.status).toBe("authenticated"));
    await screen.findByText(type === "team" ? "Volley Démo" : "Phase 01");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Suivre" }));

    // Then
    expect(
      await screen.findByRole("button", {
        name: "Suivi",
        selected: true,
        busy: false,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("2026/2027")).toBeOnTheScreen();
    expect(screen.queryByText(/Suivi confirmé/)).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls
        .filter(([, request]) => request?.method === "PUT")
        .map(([url]) => new URL(url).pathname),
    ).toEqual([`/accounts/${accountId}/${type}-follows/${team.id}`]);
  },
);

it("distinguishes a failed initial member read from false and offers an explicit read retry", async () => {
  // Given
  let available = false;
  mockFetch.mockImplementation((url, request) =>
    url.includes("team-follows") && !available
      ? Promise.resolve(Response.json({ following: "false" }))
      : transport(url, request),
  );
  const user = userEvent.setup();
  await renderFollowing(<FollowButton target={team} season={season} />);
  await waitFor(() => expect(session.status).toBe("authenticated"));

  // When
  await screen.findByText("Une erreur est survenue");

  // Then
  expect(screen.queryByRole("button", { name: "Suivre" })).toBeNull();
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PUT"),
  ).toHaveLength(0);
  available = true;
  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
});

it("rereads a temporarily hidden target when its public page is reopened after restoration", async () => {
  // Given
  let hidden = true;
  mockFetch.mockImplementation((url, request) =>
    url.includes("team-follows") && hidden
      ? Promise.resolve(new Response(null, { status: 404 }))
      : transport(url, request),
  );
  const rendered = await renderFollowing(
    <FollowButton target={team} season={season} />,
  );
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await screen.findByText("Une erreur est survenue");

  // When
  await rendered.rerender(<Text>Another page</Text>);
  hidden = false;
  await rendered.rerender(<FollowButton target={team} season={season} />);

  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
  expect(
    mockFetch.mock.calls.filter(([url]) => url.includes("team-follows")),
  ).toHaveLength(2);
});

it("keeps the confirmed member state when returning from an explicit maintenance bypass", async () => {
  // Given
  let maintenance = false;
  let revision = 0;
  let following = false;
  mockFetch.mockImplementation((url, request) => {
    if (url.endsWith("/application-access"))
      return Promise.resolve(
        Response.json({
          ...applicationAccessResponse(),
          maintenance: {
            revision,
            active: maintenance,
            message: null,
            imageUrl: null,
          },
        }),
      );
    if (url.endsWith("/accounts/me"))
      return Promise.resolve(
        Response.json({
          ...profile,
          permissions: { ...profile.permissions, bypassMaintenance: true },
        }),
      );
    if (url.includes("team-follows")) {
      if (request?.method === "PUT")
        following = JSON.parse(String(request.body)).following;
      return Promise.resolve(Response.json({ following }));
    }
    return transport(url, request);
  });
  const user = userEvent.setup();
  await renderFollowing(<FollowButton target={team} season={season} />);
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
  maintenance = true;
  revision = 1;
  await act(async () => {
    await access.retry();
    access.requestBypass(session, true);
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Suivre" }));
  await screen.findByRole("button", { name: "Suivi", busy: false });

  // When
  maintenance = false;
  revision = 2;
  await act(async () => {
    await access.retry();
  });

  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivi" })).toBeEnabled(),
  );
  // When
  await user.press(screen.getByRole("button", { name: "Suivi" }));
  // Then
  await screen.findByRole("button", { name: "Suivre", busy: false });
  const writes = mockFetch.mock.calls.filter(
    ([, request]) => request?.method === "PUT",
  );
  expect(
    writes.map(([, request]) => JSON.parse(String(request?.body))),
  ).toEqual([{ following: true }, { following: false }]);
  expect(
    new Headers(writes[0][1]?.headers).get("Blockout-Maintenance-Bypass"),
  ).toBe("true");
  expect(
    new Headers(writes[1][1]?.headers).has("Blockout-Maintenance-Bypass"),
  ).toBe(false);
});

it("invalidates after the initiating control unmounts and reads current truth on return", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, request) =>
    request?.method === "PUT" ? response.promise : transport(url, request),
  );
  const user = userEvent.setup();
  const rendered = await renderFollowing(
    <FollowButton target={team} season={season} />,
  );
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
  const owner = { ...session, accountId };

  // When
  await user.press(screen.getByRole("button", { name: "Suivre" }));
  await rendered.rerender(<Text>Another page</Text>);
  await act(async () => {
    for (const [url, request] of mockFetch.mock.calls)
      if (url.includes("team-follows") && request?.method !== "PUT")
        mockFollowStates.set(url, true);
    response.resolve(Response.json({ following: true }));
  });

  // Then
  await waitFor(() =>
    expect(
      client.getQueryState(followStateKey(owner, team))?.isInvalidated,
    ).toBe(true),
  );
  await rendered.rerender(<FollowButton target={team} season={season} />);
  expect(
    await screen.findByRole("button", {
      name: "Suivi",
      selected: true,
      busy: false,
    }),
  ).toBeEnabled();
});

it("resets owned selections and invalidates options/count without touching another owner", async () => {
  // Given
  const user = userEvent.setup();
  await renderFollowing(<FollowButton target={team} season={season} />);
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
  const owner = { ...session, accountId };
  const listKey = followListKey(owner, "team", { seasonId: season.id });
  const calendarKey = personalCalendarKey(owner, {
    category: "completed",
    timeZone: "Europe/Paris",
    seasonId: season.id,
  });
  const optionsKey = followOptionsKey(owner);
  const bypassOptionsKey = followOptionsKey(owner, true);
  const countKey = followerCountKey(team);
  client.setQueryData(listKey, {
    pages: ["former page", "continuation"],
    pageParams: [0, 1],
  });
  client.setQueryData(calendarKey, {
    pages: ["former calendar"],
    pageParams: [undefined],
  });
  client.setQueryData(optionsKey, { seasons: [season] });
  client.setQueryData(bypassOptionsKey, { seasons: [season] });
  client.setQueryData(countKey, { count: 7 });
  const otherKey = followListKey(
    { ...owner, accountId: "00000000-0000-4000-8000-000000000099" },
    "team",
  );
  client.setQueryData(otherKey, "other owner");

  // When
  await user.press(screen.getByRole("button", { name: "Suivre" }));
  await screen.findByRole("button", { name: "Suivi", busy: false });

  // Then
  expect(client.getQueryData(listKey)).toBeUndefined();
  expect(client.getQueryData(calendarKey)).toBeUndefined();
  expect(client.getQueryData(otherKey)).toBe("other owner");
  expect(client.getQueryState(optionsKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(bypassOptionsKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(countKey)?.isInvalidated).toBe(true);
});

it("preserves a confirmed write when the subsequent profile read fails", async () => {
  // Given
  const user = userEvent.setup();
  await renderFollowing(<FollowButton target={team} season={season} />);
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Suivre" }));
  await screen.findByRole("button", { name: "Suivi", busy: false });
  const owner = { ...session, accountId };
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/accounts/me")
      ? Promise.resolve(new Response(null, { status: 503 }))
      : transport(url, request),
  );

  // When
  await act(async () => {
    await client.refetchQueries({
      queryKey: getGetMyAccountQueryKey(),
      exact: true,
    });
  });

  // Then
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivi" })).toBeDisabled(),
  );
  expect(client.getQueryData(followStateKey(owner, team))).toEqual({
    following: true,
  });
});

it.each([true, false])(
  "keeps the prior state after a definite refusal of following=%s and repeats only on explicit press",
  async (following) => {
    // Given
    let writes = 0;
    let saved = !following;
    mockFetch.mockImplementation((url, request) => {
      if (request?.method === "PUT") {
        if (writes > 0) saved = following;
        return Promise.resolve(
          ++writes === 1
            ? new Response(null, { status: 400 })
            : Response.json({ following }),
        );
      }
      return url.includes("team-follows")
        ? Promise.resolve(Response.json({ following: saved }))
        : transport(url, request);
    });
    const user = userEvent.setup();
    await renderFollowing(<FollowButton target={team} season={season} />);
    await waitFor(() => expect(session.status).toBe("authenticated"));
    const label = following ? "Suivre" : "Suivi";
    await waitFor(() =>
      expect(screen.getByRole("button", { name: label })).toBeEnabled(),
    );

    // When
    await user.press(screen.getByRole("button", { name: label }));
    await screen.findByText(TECHNICAL_ERROR);

    // Then
    expect(writes).toBe(1);
    expect(screen.getByRole("button", { name: label })).toBeEnabled();
    // When
    await user.press(screen.getByRole("button", { name: label }));
    // Then
    await screen.findByRole("button", {
      name: following ? "Suivi" : "Suivre",
      busy: false,
    });
    expect(writes).toBe(2);
    expect(
      mockFetch.mock.calls.filter(
        ([url, request]) =>
          url.includes("team-follows") && request?.method !== "PUT",
      ),
    ).toHaveLength(3);
  },
);

it("refreshes current state after a lost write response while retaining ordinary failure feedback", async () => {
  // Given
  let saved = false;
  mockFetch.mockImplementation((url, request) => {
    if (request?.method === "PUT") {
      saved = true;
      return Promise.reject(new TypeError("response lost"));
    }
    return url.includes("team-follows")
      ? Promise.resolve(Response.json({ following: saved }))
      : transport(url, request);
  });
  const user = userEvent.setup();
  await renderFollowing(<FollowButton target={team} season={season} />);
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Suivre" }));

  // Then
  expect(
    await screen.findByRole("button", {
      name: "Réessayer le suivi",
      selected: true,
      busy: false,
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText(/Suivi confirmé|État actuel/),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PUT"),
  ).toHaveLength(1);
  expect(
    mockFetch.mock.calls.filter(
      ([url, request]) =>
        url.includes("team-follows") && request?.method !== "PUT",
    ),
  ).toHaveLength(2);
});

it("shares an uncertain-write observation with an explicit member reread and cancels both through Query", async () => {
  // Given
  const observation = Promise.withResolvers<Response>();
  let attempted = false;
  mockFetch.mockImplementation((url, request) => {
    if (request?.method === "PUT") {
      attempted = true;
      return Promise.reject(new TypeError("response lost"));
    }
    if (url.includes("team-follows") && attempted) return observation.promise;
    return transport(url, request);
  });
  const user = userEvent.setup();
  await renderFollowing(<FollowButton target={team} season={season} />);
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
  );
  const key = followStateKey({ ...session, accountId }, team);

  // When
  await user.press(screen.getByRole("button", { name: "Suivre" }));
  await waitFor(() =>
    expect(client.getQueryState(key)?.fetchStatus).toBe("fetching"),
  );
  let reread: Promise<void>;
  await act(async () => {
    reread = client.refetchQueries(
      { queryKey: key, exact: true },
      { cancelRefetch: false },
    );
  });
  const reads = mockFetch.mock.calls.filter(
    ([url, request]) =>
      url.includes("team-follows") && request?.method !== "PUT",
  );
  await act(async () => {
    await client.cancelQueries({ queryKey: key, exact: true });
    observation.resolve(Response.json({ following: true }));
    await reread;
  });

  // Then
  expect(reads).toHaveLength(2);
  expect(reads[1][1]?.signal?.aborted).toBe(true);
  expect(client.getQueryData(key)).toEqual({ following: false });
  expect(
    await screen.findByText(
      "Le résultat du suivi n’a pas pu être confirmé. Vous pouvez réessayer la même demande.",
    ),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PUT"),
  ).toHaveLength(1);
});

it.each(["guest", "other", "same"] as const)(
  "keeps a late original mutation out of the current native scope after switching to %s",
  async (destination) => {
    // Given
    const response = Promise.withResolvers<Response>();
    let currentAccountId = accountId;
    mockFetch.mockImplementation((url, request) =>
      request?.method === "PUT"
        ? response.promise
        : url.endsWith("/accounts/me")
          ? Promise.resolve(
              Response.json({ ...profile, accountId: currentAccountId }),
            )
          : transport(url, request),
    );
    const user = userEvent.setup();
    await renderFollowing(<FollowButton target={team} season={season} />);
    await waitFor(() => expect(session.status).toBe("authenticated"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
    );
    const owner = { ...session, accountId };
    {
      await user.press(screen.getByRole("button", { name: "Suivre" }));
      await waitFor(() =>
        expect(
          mockFetch.mock.calls.filter(
            ([, request]) => request?.method === "PUT",
          ),
        ).toHaveLength(1),
      );

      // When
      await act(async () => {
        await session.clearCredentials();
        if (destination !== "guest") {
          currentAccountId =
            destination === "same"
              ? accountId
              : "00000000-0000-4000-8000-000000000099";
          const credentials = credentialsFor(`auth0|${destination}`);
          mockAuth0.webAuth.mockResolvedValue(credentials);
          mockAuth0.getCredentials.mockResolvedValue(credentials);
          mockAuth0.saveCredentials.mockResolvedValue();
          await session.signIn("https://api.example.invalid");
        }
        response.resolve(Response.json({ following: true }));
      });

      // Then
      await waitFor(() => expect(client.isMutating()).toBe(0));
      await waitFor(() =>
        expect(session.status).toBe(
          destination === "guest" ? "guest" : "authenticated",
        ),
      );
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Suivre" })).toBeEnabled(),
      );
      expect(client.getQueryData(followStateKey(owner, team))).toEqual(
        destination === "same" ? { following: false } : undefined,
      );
      expect(screen.queryByText(/Suivi confirmé/)).not.toBeOnTheScreen();
    }
  },
);

it("suspends the canonical confirmed relation when its maintenance bypass is cleared", async () => {
  // Given: the confirmed relationship is shared, while admission belongs to the current intent.
  mockFetch.mockImplementation((url, request) => {
    if (url.endsWith("/application-access"))
      return Promise.resolve(
        Response.json({
          ...applicationAccessResponse(),
          maintenance: {
            revision: 1,
            active: true,
            message: null,
            imageUrl: null,
          },
        }),
      );
    if (url.endsWith("/accounts/me"))
      return Promise.resolve(
        Response.json({
          ...profile,
          permissions: { ...profile.permissions, bypassMaintenance: true },
        }),
      );
    if (url.includes("team-follows"))
      return Promise.resolve(Response.json({ following: true }));
    return transport(url, request);
  });
  const user = userEvent.setup();
  await renderFollowing(<FollowButton target={team} season={season} />);
  await waitFor(() => expect(session.status).toBe("authenticated"));
  await waitFor(() => expect(session.accountId).toBe(accountId));
  await act(async () => {
    access.requestBypass(session, true);
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suivi" })).toBeEnabled(),
  );

  // When
  await act(async () => access.clearBypass());
  await user.press(screen.getByRole("button", { name: "Suivi" }));

  // Then: retained display data cannot authorize a new write.
  expect(screen.getByRole("button", { name: "Suivi" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PUT"),
  ).toEqual([]);
});

/** Captures the real private client while the fixture retains its separate public-cache owner for cleanup. */
function PrivateQueries({ children }: PropsWithChildren) {
  const privateClient = useQueryClient();
  // Configure deterministic failure presentation before child Query observers mount.
  privateClient.setQueryDefaults([], { retry: false, gcTime: Infinity });
  privateClient.setMutationDefaults([], { gcTime: Infinity });
  useLayoutEffect(() => {
    client = privateClient;
  }, [privateClient]);
  return children;
}

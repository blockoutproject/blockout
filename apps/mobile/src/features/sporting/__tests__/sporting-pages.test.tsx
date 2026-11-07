import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
  ReactElement,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import * as proSessionModule from "../../pro/pro-session";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";
import { Linking, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type {
  ClubDetailResponse,
  TeamDetailResponse,
  PoolDetailResponse,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import type { AccountSession } from "../../accounts";
import { accountResponse } from "../../accounts/test-support/account-response";
import { ownContributions } from "../../contributions/test-support/contribution-data";
import { supportContext } from "../../support/model/support-context";
import TeamRoute from "../../../app/(ordinary)/teams/[teamId]";
import PoolRoute from "../../../app/(ordinary)/pools/[poolId]";
import PresentationRoute from "../../../app/(operations)/administration/presentation/[kind]/[id]";
import { renderRouter } from "expo-router/testing-library";
import { router } from "expo-router";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  clubDetail,
  matchDetail,
  sportingId,
} from "../test-support/consultation-data";
import { ClubScreen } from "../screens/club-screen";
import { TeamScreen } from "../screens/team-screen";
import { PoolScreen } from "../screens/pool-screen";
import { MatchScreen } from "../screens/match-screen";
import { MatchSummary } from "../components/match-summary";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
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
  // Isolated pages control the native navigation boundary; real route scenarios retain Router focus.
  useFocusEffect: (effect: () => void | (() => void)) =>
    mockRouting
      ? jest.requireActual("expo-router").useFocusEffect(effect)
      : jest.requireActual("react").useEffect(effect, [effect]),
  useRouter: () =>
    mockRouting
      ? jest.requireActual("expo-router").useRouter()
      : { back: mockBack, push: mockPush, canGoBack: () => true },
  useNavigation: () =>
    mockRouting
      ? jest.requireActual("expo-router").useNavigation()
      : { isFocused: () => true },
  useLocalSearchParams: () =>
    mockRouting
      ? jest.requireActual("expo-router").useLocalSearchParams()
      : mockRouteParams,
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRouteParams = { teamId: sportingId, poolId: sportingId };
let mockRouting = false;
const environment = { ...process.env };
const season = {
  id: "00000000-0000-4000-8000-000000000010",
  label: "2027/2028",
  startYear: 2027,
};
const olderSeason = {
  id: "00000000-0000-4000-8000-000000000011",
  label: "2026/2027",
  startYear: 2026,
};
const secondPoolId = "00000000-0000-4000-8000-000000000012";
let client: QueryClient;
let publicClient = createQueryClient();
let club: ClubDetailResponse;
let team: TeamDetailResponse;
let pool: PoolDetailResponse;
let match = matchDetail();
let account = accountResponse();
let contributions = ownContributions();
let following = false;
let session: AccountSession;

/** Controlled HTTP only; the screens use real generated decoders, Query, access and session owners. */
function reads(url: string, request?: RequestInit): Promise<Response> {
  const parsed = new URL(url);
  const path = parsed.pathname;
  if (path.endsWith("/application-access")) {
    return Promise.resolve(Response.json(applicationAccessResponse()));
  }
  if (path === "/accounts/me") {
    return Promise.resolve(Response.json(account));
  }
  if (path.endsWith("/presentation")) {
    return Promise.resolve(
      Response.json({
        id: sportingId,
        ...(path.includes("/clubs/")
          ? { kind: "club" }
          : path.includes("/teams/")
            ? { kind: "team" }
            : {}),
        revision: "presentation-1",
        names: {
          sourceName: "Source",
          effectiveName: "Presented name",
          manualName: "Presented name",
          effectiveShortName: "Short",
          manualShortName: null,
        },
        ...(!path.includes("/pools/")
          ? {
              logo: { effectiveUrl: null, manualUrl: null, automaticUrl: null },
            }
          : {}),
      }),
    );
  }
  if (path.endsWith("/follower-count")) {
    return Promise.resolve(Response.json({ count: following ? 8 : 7 }));
  }
  if (path.includes("/team-follows/") || path.includes("/pool-follows/")) {
    if (request?.method === "PUT") {
      following = JSON.parse(String(request.body)).following;
    }
    return Promise.resolve(Response.json({ following }));
  }
  if (path.includes("/stream-contributions")) {
    return Promise.resolve(Response.json(contributions));
  }
  if (path.endsWith(`/clubs/${sportingId}/teams`)) {
    return Promise.resolve(
      Response.json({
        seasonId: parsed.searchParams.get("seasonId"),
        items: [
          {
            ...team.team,
            season:
              parsed.searchParams.get("seasonId") === olderSeason.id
                ? olderSeason
                : season,
          },
        ],
      }),
    );
  }
  if (path.endsWith(`/clubs/${sportingId}`)) {
    return Promise.resolve(Response.json(club));
  }
  if (path.endsWith(`/teams/${sportingId}`)) {
    return Promise.resolve(Response.json(team));
  }
  if (path.endsWith("/standings")) {
    return Promise.resolve(
      Response.json({
        poolId: path.split("/")[2],
        availability: "unavailable",
        lastAttemptFailed: false,
        columns: [],
        rows: [],
      }),
    );
  }
  if (path.endsWith(`/pools/${sportingId}`)) {
    return Promise.resolve(Response.json(pool));
  }
  if (path.endsWith(`/matches/${sportingId}`)) {
    return Promise.resolve(Response.json(match));
  }
  if (path === "/matches") {
    return Promise.resolve(
      Response.json({
        category: parsed.searchParams.get("category"),
        timeZone: parsed.searchParams.get("timeZone"),
        evaluatedAt: "2026-10-25T12:00:00Z",
        days: [],
      }),
    );
  }
  throw new Error(`Unexpected controlled request ${path}`);
}

/** Retrieves the real private lifetime client; failure scenarios explicitly disable read retries. */
function PrivateQueries({ children }: QueryFixtureProps) {
  const current = useQueryClient();
  const currentSession = useAccountSession();
  // Configure this fresh real client before descendant public observers start their first request.
  useQueryFixtureState(() => {
    current.setQueryDefaults([], { retry: false });
    return true;
  });
  useLayoutEffect(() => {
    client = current;
    session = currentSession;
  }, [current, currentSession]);
  return children;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  publicClient = createQueryClient();
  match = matchDetail();
  account = accountResponse();
  contributions = ownContributions();
  following = false;
  mockRouting = false;
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|sporting-viewer"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockPush.mockReset();
  mockBack.mockReset();
  club = {
    ...clubDetail("Volley des Deux Rives"),
    seasons: [season, olderSeason],
  };
  pool = { pool: { ...matchDetail().match.pool, season } };
  team = {
    team: {
      team: { id: sportingId, name: "Équipe des Deux Rives" },
      season,
      classification: {},
      professional: true,
    },
    participations: [
      pool.pool,
      {
        ...pool.pool,
        pool: { id: secondPoolId, name: "Pool" },
        phaseName: "Phase finale",
      },
    ],
  };
  mockFetch.mockReset().mockImplementation(reads);
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  // Jest owns pending native/Query batching; restore real time only after unmounted work is drained.
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it.each(["club", "team", "pool"] as const)(
  "opens the actual F02 presentation entry for the exact %s and withdraws a revoked grant",
  async (kind) => {
    // Given: actual F05 profile, F12 capability and F02 entry; only SDK and HTTP are controlled.
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    account = accountResponse({
      permissions: { ...account.permissions, manageSportingPresentation: true },
    });
    const user = userEvent.setup();
    const editLabel = {
      team: "Modifier l’équipe",
      club: "Modifier le club",
      pool: "Modifier la poule",
    }[kind];
    mockRouting = true;
    await renderPage(
      {
        club: <ClubScreen clubId={sportingId} />,
        team: <TeamScreen teamId={sportingId} />,
        pool: <PoolScreen poolId={sportingId} />,
      }[kind],
      true,
    );
    // F05 replaces the guest lifetime during restoration; measure the current authenticated pager.
    await waitFor(() => expect(session.accountId).toBe(account.accountId));
    await layoutNativeTabs();
    expect(screen.getByTestId("native-tabs-pager")).toBeOnTheScreen();

    // When
    await user.press(await screen.findByRole("button", { name: editLabel }));

    // Then
    expect(
      await screen.findByLabelText(
        kind === "club" ? "Nom personnalisé" : "Nom complet personnalisé",
      ),
    ).toHaveDisplayValue("Presented name");
    expect(screen).toHavePathname(
      `/administration/presentation/${kind}/${sportingId}`,
    );
    expect(
      mockFetch.mock.calls.some(
        ([url]) =>
          new URL(url).pathname ===
          `/administration/${kind}s/${sportingId}/presentation`,
      ),
    ).toBe(true);
    expect(
      screen.queryByRole("link", { name: /Modifier.*(score|match)/i }),
    ).not.toBeOnTheScreen();

    // When: the current account read removes the grant while the public page remains mounted.
    await act(async () => router.back());
    // Router remounts the public page; settle its native pager before checking the fixed-header action.
    await layoutNativeTabs();
    await screen.findByRole("button", { name: editLabel });
    account = accountResponse();
    await act(async () =>
      client.refetchQueries({ queryKey: ["/accounts/me"], exact: true }),
    );

    // Then
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: editLabel }),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.getByRole("button", { name: "Signaler un problème" }),
    ).toBeOnTheScreen();
  },
);

it.each(["team", "pool"] as const)(
  "uses one real %s follow/count region across tabs and submits through F06",
  async (kind) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    const user = userEvent.setup();
    await renderPage(kind === "team" ? <TeamRoute /> : <PoolRoute />);
    // The native layout belongs to the restored principal, not the retired guest subtree.
    await waitFor(() => expect(session.accountId).toBe(account.accountId));
    await layoutNativeTabs();
    expect(screen.getByTestId("native-tabs-pager")).toBeOnTheScreen();
    await screen.findByRole("button", { name: "Suivre", disabled: false });

    // When
    await user.press(screen.getByRole("tab", { name: "À venir" }));
    await user.press(screen.getByRole("button", { name: "Suivre" }));

    // Then
    await screen.findByRole("button", { name: "Suivi", busy: false });
    expect(screen.getAllByRole("button", { name: "Suivi" })).toHaveLength(1);
    expect(await screen.findByLabelText("8 abonnés")).toBeOnTheScreen();
    const writes = mockFetch.mock.calls.filter(
      ([, request]) => request?.method === "PUT",
    );
    expect(writes).toHaveLength(1);
    expect(new URL(writes[0][0]).pathname).toBe(
      `/accounts/${account.accountId}/${kind}-follows/${sportingId}`,
    );
    expect(JSON.parse(writes[0][1].body)).toEqual({ following: true });
    expect(new Headers(writes[0][1].headers).get("Authorization")).toBe(
      "Bearer test-access-token",
    );
    expect(
      screen.getByRole("tab", { name: "À venir", selected: true }),
    ).toBeOnTheScreen();
  },
);

it("keeps public team/count available while credential restoration is unresolved", async () => {
  // Given
  const credentials = Promise.withResolvers<boolean>();
  mockAuth0.hasValidCredentials.mockReturnValue(credentials.promise);

  // When
  await renderPage(<TeamRoute />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();

  // Then
  expect(await screen.findByText(team.team.team.name)).toBeOnTheScreen();
  expect(await screen.findByLabelText("7 abonnés")).toBeOnTheScreen();
  expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/accounts/")),
  ).toBe(false);
  expect(
    screen.queryByRole("button", { name: "Modifier l’équipe" }),
  ).not.toBeOnTheScreen();
  await act(async () => credentials.resolve(false));
});

it("retires authorized editing on sign-out while keeping guest follow and public consultation", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  account = accountResponse({
    permissions: { ...account.permissions, manageSportingPresentation: true },
  });
  const user = userEvent.setup();
  await renderPage(<TeamRoute />);
  await waitFor(() => expect(session.accountId).toBe(account.accountId));
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByRole("button", { name: "Modifier l’équipe" });

  // When
  await act(async () => session.signOut());
  await screen.findByRole("button", { name: "Suivre", disabled: false });
  await user.press(screen.getByRole("button", { name: "Suivre" }));

  // Then
  expect(
    screen.queryByRole("button", { name: "Modifier l’équipe" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByText(team.team.team.name)).toBeOnTheScreen();
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/sign-in-invitation",
    params: { reason: "follow" },
  });
  expect(
    mockFetch.mock.calls.some(([, request]) => request?.method === "PUT"),
  ).toBe(false);
});

it.each([false, true])(
  "opens the F08 first-proposal entry with authenticated=%s",
  async (authenticated) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(authenticated);
    const user = userEvent.setup();
    await renderPage(<MatchScreen matchId={sportingId} />);

    // When
    await user.press(
      await screen.findByRole("button", { name: "Proposer un lien" }),
    );

    // Then
    expect(mockPush).toHaveBeenCalledWith(
      authenticated
        ? {
            pathname: "/matches/[matchId]/contribution",
            params: { matchId: sportingId },
          }
        : {
            pathname: "/sign-in-invitation",
            params: { reason: "contribution" },
          },
    );
    expect(
      mockFetch.mock.calls.some(([, request]) => request?.method === "POST"),
    ).toBe(false);
  },
);

it.each(["guest", "other", "owner"] as const)(
  "keeps F08 exact-version reporting and ownership for %s",
  async (viewer) => {
    // Given
    const contributionId = "00000000-0000-4000-8000-000000000099";
    const url = "https://youtu.be/sporting-fixture";
    match = { ...match, streamUrl: url, streamContributionId: contributionId };
    mockAuth0.hasValidCredentials.mockResolvedValue(viewer !== "guest");
    if (viewer === "owner") {
      contributions = ownContributions({
        proposalCount: 1,
        activeContribution: {
          id: contributionId,
          url,
          platform: "youtube",
          state: "active",
          submittedAt: "2026-10-01T10:00:00Z",
          canCancel: false,
          canWithdraw: true,
        },
      });
    }
    const user = userEvent.setup();
    await renderPage(<MatchScreen matchId={sportingId} />);

    // When
    await user.press(
      await screen.findByRole("button", {
        name: viewer === "owner" ? "Modifier le lien" : "Signaler le lien",
      }),
    );

    // Then
    expect(mockPush).toHaveBeenCalledWith(
      viewer === "guest"
        ? {
            pathname: "/sign-in-invitation",
            params: { reason: "stream-report" },
          }
        : viewer === "owner"
          ? {
              pathname: "/matches/[matchId]/contributions",
              params: { matchId: sportingId },
            }
          : {
              pathname: "/matches/[matchId]/report-contribution",
              params: {
                matchId: sportingId,
                contributionId,
                contributionUrl: url,
              },
            },
    );
    if (viewer === "owner") {
      expect(
        screen.queryByRole("button", { name: "Signaler le lien" }),
      ).not.toBeOnTheScreen();
    }
    expect(
      screen.getByRole("button", { name: "Signaler un problème" }),
    ).toBeOnTheScreen();
  },
);

/** Supplies the actual application owners without mounting unrelated root navigation/provider SDKs. */
function renderPage(content: ReactElement, editorRoute = false) {
  const options = {
    wrapper: ({ children }: QueryFixtureProps) => (
      <GestureHandlerRootView>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, right: 0, bottom: 0, left: 0 },
          }}
        >
          <QueryClientProvider client={publicClient}>
            <ThemeProvider>
              <ActionFeedbackProvider scopeKey="test">
                <ApplicationAccessProvider>
                  <AccountSessionProvider>
                    <PrivateQueries>
                      <AdvertisingProviders>{children}</AdvertisingProviders>
                    </PrivateQueries>
                  </AccountSessionProvider>
                </ApplicationAccessProvider>
              </ActionFeedbackProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    ),
  };
  return editorRoute
    ? renderRouter(
        {
          index: () => content,
          "administration/presentation/[kind]/[id]": PresentationRoute,
        },
        options,
      )
    : render(content, options);
}

it.each(["club", "team", "pool", "match"] as const)(
  "keeps support available after a failed %s detail read",
  async (kind) => {
    // Given
    mockFetch.mockImplementation((url: string) =>
      String(url).endsWith("/application-access")
        ? Promise.resolve(Response.json(applicationAccessResponse()))
        : Promise.resolve(
            Response.json(
              {
                type: "urn:blockout:problem:not-found",
                title: "Not found",
                status: 404,
              },
              { status: 404 },
            ),
          ),
    );
    const page = {
      club: <ClubScreen clubId={sportingId} />,
      team: <TeamScreen teamId={sportingId} />,
      pool: <PoolScreen poolId={sportingId} />,
      match: <MatchScreen matchId={sportingId} />,
    }[kind];
    await renderPage(page);
    await screen.findByRole("alert", { name: "Une erreur est survenue" });
    const user = userEvent.setup();

    // When
    await user.press(
      await screen.findByRole("button", { name: "Signaler un problème" }),
    );

    // Then
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/support",
      params: { originScreen: kind, targetType: kind, targetId: sportingId },
    });
    const { originScreen, targetType, targetId } =
      mockPush.mock.calls[0][0].params;
    expect(
      supportContext({ screen: originScreen, targetType, targetId }),
    ).toEqual({
      screen: { club: "Club", team: "Équipe", pool: "Poule", match: "Match" }[
        kind
      ],
      action: "Consultation de la cible",
      target: { type: kind, id: sportingId },
    });
  },
);

it("shares the newest/selected club season between teams and both calendar entries", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByText(club.club.name);

  // When
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByRole("link", { name: team.team.team.name });
  await user.press(screen.getByRole("button", { name: "Saison 2027/2028" }));
  await user.press(screen.getByRole("button", { name: "2026/2027" }));
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "À venir" }));

  // Then
  await screen.findByText("Aucun match pour cette sélection");
  // When
  await user.press(screen.getByRole("tab", { name: "Terminés" }));
  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls
        .map(([url]) => new URL(url))
        .filter((url) => url.pathname === "/matches")
        .map((url) => [
          url.searchParams.get("seasonId"),
          url.searchParams.get("category"),
        ]),
    ).toEqual([
      [olderSeason.id, "upcoming"],
      [olderSeason.id, "completed"],
    ]),
  );
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).includes(`seasonId=${olderSeason.id}`),
    ),
  ).toBe(true);
});

it("replaces the club's native scroll context on season change while retaining its selected category", async () => {
  // Given: a visited calendar belongs to the original season and its native pager.
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByText("Aucun match pour cette sélection");
  const originalPager = screen.getByTestId("native-tabs-pager");

  // When: opening choices does not change the season or dispose its scroll context.
  await user.press(screen.getByRole("button", { name: "Saison 2027/2028" }));

  // Then
  expect(originalPager).toBeOnTheScreen();

  // When: applying another season starts a new native context, not a restoration of the old offset.
  await user.press(screen.getByRole("button", { name: "2026/2027" }));
  await layoutNativeTabs();

  // Then: native pager disposal is observed at its host boundary; shared scene ownership remains real.
  expect(originalPager).not.toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Terminés", selected: true }),
  ).toBeOnTheScreen();
  await screen.findByText("Aucun match pour cette sélection");
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/clubs/${sportingId}`,
    ),
  ).toHaveLength(1);
  expect(
    mockFetch.mock.calls
      .map(([url]) => new URL(url))
      .filter((url) => url.pathname === "/matches")
      .map((url) => [
        url.searchParams.get("seasonId"),
        url.searchParams.get("category"),
      ]),
  ).toEqual([
    [season.id, "completed"],
    [olderSeason.id, "completed"],
  ]);
});

it("retains a valid season through failed retrieval and falls back only after successful disappearance", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByText(club.club.name);
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await user.press(screen.getByRole("button", { name: "Saison 2027/2028" }));
  await user.press(screen.getByRole("button", { name: "2026/2027" }));
  await layoutNativeTabs();
  const selectedPager = screen.getByTestId("native-tabs-pager");
  mockFetch.mockRejectedValue(new TypeError("offline"));

  // When
  await act(async () => {
    await client.refetchQueries({
      predicate: (q) =>
        q.queryKey.some(
          (k) => typeof k === "string" && k.endsWith(`/clubs/${sportingId}`),
        ),
    });
  });

  // Then
  expect(
    screen.getByRole("button", { name: "Saison 2026/2027" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  club = { ...club, seasons: [season] };
  mockFetch.mockImplementation(reads);
  // When
  await act(async () => {
    await client.refetchQueries({
      predicate: (query) => query.queryKey.includes(`/clubs/${sportingId}`),
    });
  });
  // The accepted fallback replaces the old season's native container before its new layout arrives.
  await waitFor(() => expect(selectedPager).not.toBeOnTheScreen());
  await layoutNativeTabs();
  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison 2027/2028" }),
    ).toBeOnTheScreen(),
  );
});

it.each(["empty", "populated"] as const)(
  "keeps the selected %s season after a former teams request completes late",
  async (currentState) => {
    // Given: generated reads and the screen stay real; only HTTP completion is controlled.
    const formerTeams = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url: string) => {
      const parsed = new URL(url);
      if (parsed.pathname === `/clubs/${sportingId}/teams`) {
        if (parsed.searchParams.get("seasonId") === season.id) {
          return formerTeams.promise;
        }
        if (currentState === "empty") {
          return Promise.resolve(
            Response.json({ seasonId: olderSeason.id, items: [] }),
          );
        }
      }
      return reads(url);
    });
    const user = userEvent.setup();
    await renderPage(<ClubScreen clubId={sportingId} />);
    await screen.findByRole("tab", { name: "À venir" });
    await layoutNativeTabs();
    await screen.findByText(club.club.name);
    await user.press(screen.getByRole("tab", { name: "Équipes" }));
    await screen.findByRole("progressbar", {
      name: "Chargement des équipes du club",
    });

    // When
    await user.press(
      screen.getByRole("button", { name: `Saison ${season.label}` }),
    );
    await user.press(screen.getByRole("button", { name: olderSeason.label }));
    await layoutNativeTabs();
    const currentContent =
      currentState === "empty"
        ? "Aucune équipe pour cette saison"
        : team.team.team.name;
    await screen.findByText(currentContent);
    await act(async () =>
      formerTeams.resolve(
        Response.json({
          seasonId: season.id,
          items: [
            { ...team.team, team: { id: secondPoolId, name: "Obsolete team" } },
          ],
        }),
      ),
    );

    // Then
    expect(screen.queryByText("Obsolete team")).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: `Saison ${olderSeason.label}` }),
    ).toBeOnTheScreen();
    if (currentState === "populated") {
      expect(
        screen.getByRole("link", { name: currentContent }),
      ).toBeOnTheScreen();
    } else {
      expect(screen.getByText(currentContent)).toBeOnTheScreen();
    }
  },
);

it("keeps the selected participation and permits selecting its former index after a team refetch inserts a phase", async () => {
  // Given: the page uses real Query and RNCT; only HTTP/native layout and pager I/O are controlled.
  const user = userEvent.setup();
  team.participations = team.participations.map((entry, index) => ({
    ...entry,
    pool: { ...entry.pool, name: index === 0 ? "Phase A" : "Phase B" },
  }));
  await renderPage(<TeamScreen teamId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: /Phase B/ }));

  // When: B stays selected while a new phase moves B and A to different native page indices.
  team = {
    ...team,
    participations: [
      {
        ...team.participations[0],
        pool: { id: "00000000-0000-4000-8000-000000000013", name: "Phase X" },
      },
      ...team.participations,
    ],
  };
  await act(async () => {
    await client.refetchQueries({
      predicate: (query) => query.queryKey.includes(`/teams/${sportingId}`),
    });
  });
  await screen.findByRole("tab", { name: /Phase X/ });

  // Then: the same identity stays selected and the page now occupying B's former index remains selectable.
  expect(
    screen.getByRole("tab", { name: /Phase B/, selected: true }),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("tab", { name: /Phase A/ }));
  expect(
    screen.getByRole("tab", { name: /Phase A/, selected: true }),
  ).toBeOnTheScreen();
});

it("keeps a clubless professional team and one follow action across distinct phase tabs", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<TeamRoute />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();

  // When
  await user.press(
    await screen.findByRole("tab", { name: "Pool · Phase finale" }),
  );
  await user.press(screen.getByRole("button", { name: "Suivre" }));

  // Then
  expect(
    screen.getByRole("link", { name: "Pool · Phase finale" }),
  ).toBeOnTheScreen();
  expect(screen.getAllByRole("button", { name: "Suivre" })).toHaveLength(1);
  expect(screen.getByLabelText("7 abonnés")).toBeOnTheScreen();
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/sign-in-invitation",
    params: { reason: "follow" },
  });
  expect(screen.queryByRole("link", { name: "Le club" })).not.toBeOnTheScreen();
  expect(screen.getByRole("tab", { name: "À venir" })).toBeOnTheScreen();
  expect(screen.getByRole("tab", { name: "Terminés" })).toBeOnTheScreen();
});

it("opens exact club and pool identities without substituting a namesake", async () => {
  // Given
  team = {
    ...team,
    team: { ...team.team, club: club.club },
    participations: team.participations.map((entry) => ({
      ...entry,
      competitionName: "Unnecessary competition subtitle",
    })),
  };
  const user = userEvent.setup();
  await renderPage(<TeamScreen teamId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();

  // When
  await user.press(
    await screen.findByRole("link", {
      name: "Le club",
    }),
  );
  await user.press(screen.getByRole("tab", { name: "Pool · Phase finale" }));
  const poolLink = screen.getByRole("link", { name: "Pool · Phase finale" });
  expect(
    within(poolLink).getByRole("image", {
      name: "Logo absent : Pool · Phase finale",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Unnecessary competition subtitle"),
  ).not.toBeOnTheScreen();
  await user.press(poolLink);

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/clubs/[clubId]",
    params: { clubId: sportingId },
  });
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/pools/[poolId]",
    params: { poolId: secondPoolId },
  });
});

it("keeps the pool season and phase independent of later standings and map content", async () => {
  // Given
  pool = { pool: { ...pool.pool, phaseName: "Qualification" } };
  const user = userEvent.setup();
  await renderPage(
    <PoolScreen
      poolId={sportingId}
      renderMap={(context) => <Text>{`Map ${context.pool.id}`}</Text>}
    />,
  );
  await screen.findByRole("tab", { name: "Carte" });
  await layoutNativeTabs();

  // When
  await user.press(screen.getByRole("tab", { name: "Carte" }));

  // Then
  expect(screen.getByText("Qualification")).toBeOnTheScreen();
  expect(screen.getByText(season.label)).toBeOnTheScreen();
  expect(screen.getByText(`Map ${sportingId}`)).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it.each(["Équipes", "À venir", "Terminés"])(
  "shows one accepted no-season state in Club %s and refreshes only its club metadata",
  async (label) => {
    // Given: the accepted club has no available season; its Info content remains usable.
    club = { ...club, seasons: [] };
    const user = userEvent.setup();
    await renderPage(<ClubScreen clubId={sportingId} />);
    await screen.findByRole("tab", { name: "À venir" });
    await layoutNativeTabs();
    await screen.findByText("Coordonnées");
    mockFetch.mockClear();

    // When
    await user.press(screen.getByRole("tab", { name: label }));

    // Then: one successful empty state replaces an unavailable seasonal collection.
    expect(
      await screen.findByRole("header", { name: "Aucune saison disponible" }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("Aucune saison disponible")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();

    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

    // When: the accepted empty club is explicitly refreshed through its card.
    await user.press(screen.getByRole("button", { name: "Actualiser" }));

    // Then: no Teams or calendar request can be made without a season.
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(new URL(String(mockFetch.mock.calls[0][0])).pathname).toBe(
      `/clubs/${sportingId}`,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Actualiser" })).not.toBeBusy(),
    );
    expect(screen.getByText("Aucune saison disponible")).toBeOnTheScreen();

    // When
    await user.press(screen.getByRole("tab", { name: "Infos" }));

    // Then
    expect(await screen.findByText("Coordonnées")).toBeOnTheScreen();
    expect(screen.getByText("Commune du club")).toBeOnTheScreen();
    expect(
      screen.queryByText("Aucune saison disponible"),
    ).not.toBeOnTheScreen();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  },
);

it.each([404, 503])(
  "presents unavailable and failed initial reads with opaque copy (%s)",
  async (status) => {
    // Given
    mockFetch.mockImplementation((url: string) =>
      url.includes("/teams/")
        ? Promise.resolve(
            Response.json(
              { type: "about:blank", title: "Unavailable", status },
              { status },
            ),
          )
        : reads(url),
    );
    await renderPage(<TeamScreen teamId={sportingId} />);

    // When
    const error = await screen.findByRole("alert");

    // Then
    expect(error).toHaveTextContent("Une erreur est survenue");
    expect(screen.queryByText(team.team.team.name)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  },
);

it("keeps match identities and independent missing sections without a zero score or guessed venue", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<MatchScreen matchId={sportingId} />);
  expect(screen.getByRole("button", { name: "Retour" })).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Signaler un problème" }),
  ).toBeOnTheScreen();

  // When
  await user.press(
    await screen.findByRole("link", {
      name: "Home · Score domicile : indisponible",
    }),
  );
  await user.press(screen.getByRole("link", { name: "Poule : Pool" }));

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/teams/[teamId]",
    params: { teamId: sportingId },
  });
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/pools/[poolId]",
    params: { poolId: sportingId },
  });
  expect(screen.getByText("Heure à définir")).toBeOnTheScreen();
  expect(screen.getByText("À venir")).toBeOnTheScreen();
  expect(screen.getByLabelText("Lieu : -")).toBeOnTheScreen();
  expect(screen.getByLabelText("Arbitres : -")).toBeOnTheScreen();
  expect(screen.queryByText("0")).not.toBeOnTheScreen();
});

it("opens only effective safe contacts and labels the club municipality separately", async () => {
  // Given
  club = {
    ...club,
    contacts: {
      phone: "+33 1 23 45 67 89",
      email: "club@example.invalid",
      website: "https://club.example.invalid/path",
    },
    location: { latitude: 46.32, longitude: -0.46, label: "Niort" },
  };
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();

  // When
  await user.press(
    await screen.findByRole("link", { name: "Téléphone : +33 1 23 45 67 89" }),
  );
  await user.press(
    screen.getByRole("link", { name: "E-mail du club : club@example.invalid" }),
  );
  await user.press(
    screen.getByRole("link", {
      name: "Site web : https://club.example.invalid/path",
    }),
  );

  // Then
  expect(open.mock.calls.map(([url]) => url)).toEqual([
    "tel:+33123456789",
    "mailto:club%40example.invalid",
    "https://club.example.invalid/path",
  ]);
  expect(screen.getByText("Commune du club")).toBeOnTheScreen();
});

it.each(["provisional", "unconfirmed", "final"] as const)(
  "preserves the %s result, published zero and special notation independently of absent sets",
  async (state) => {
    // Given
    match.match.result = {
      state,
      homeSets: 0,
      specialLabel: "Forfait extérieur",
      observedAt: "2026-10-24T14:00:00Z",
    };
    await renderPage(<MatchScreen matchId={sportingId} />);

    // When
    const score = await screen.findByLabelText("Score domicile : 0");

    // Then
    expect(score).toHaveTextContent("0");
    expect(
      screen.getByLabelText("Score extérieur : indisponible"),
    ).toHaveTextContent("-");
    expect(screen.getByText("Forfait extérieur")).toBeOnTheScreen();
    expect(
      screen.getByText(
        state === "final"
          ? "Terminé"
          : state === "provisional"
            ? "Score provisoire"
            : "Résultat non confirmé",
      ),
    ).toBeOnTheScreen();
    if (state !== "final") {
      expect(
        screen.getByText("Résultat définitif indisponible"),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(/ · Résultat définitif indisponible/),
      ).not.toBeOnTheScreen();
    }
    expect(screen.getByText("Détail des sets indisponible")).toBeOnTheScreen();
  },
);

it.each(["provisional", "unconfirmed"] as const)(
  "retains the full %s uncertainty when the contribution context has no status band",
  async (state) => {
    // Given
    match.match.result = {
      state,
      homeSets: 2,
      awaySets: 1,
      observedAt: "2026-10-24T14:00:00Z",
    };

    // When
    await renderPage(
      <MatchSummary match={match.match} presentation="context" />,
    );

    // Then
    expect(
      screen.getByText(
        state === "provisional"
          ? "Résultat provisoire · Résultat définitif indisponible"
          : "Résultat non confirmé · Résultat définitif indisponible",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Score domicile : 2")).toHaveTextContent("2");
    expect(screen.getByLabelText("Score extérieur : 1")).toHaveTextContent("1");
    expect(screen.queryByRole("link")).not.toBeOnTheScreen();
  },
);

it("retains exact published set points and separates the match venue from a club municipality", async () => {
  // Given
  match.sets = {
    observedAt: "2026-10-24T14:00:00Z",
    items: [
      { home: 25, away: 0 },
      { home: 23, away: 25 },
    ],
  };
  match.venueName = "Gymnase des Rives";
  match.venueAddress = "12 rue des Sports, Niort";
  match.referees = ["Arbitre de démonstration"];
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const user = userEvent.setup();
  await renderPage(<MatchScreen matchId={sportingId} />);

  // When
  await user.press(
    await screen.findByRole("link", {
      name: "Lieu : Gymnase des Rives · 12 rue des Sports, Niort",
    }),
  );

  // Then
  expect(screen.getByLabelText("Set 1 : 25 à 0")).toBeOnTheScreen();
  expect(screen.getByLabelText("Set 2 : 23 à 25")).toBeOnTheScreen();
  expect(
    screen.getByLabelText("Arbitres : Arbitre de démonstration"),
  ).toBeOnTheScreen();
  expect(open).toHaveBeenCalledWith(
    expect.stringContaining(encodeURIComponent(match.venueAddress)),
  );
  expect(screen.queryByText("Commune du club")).not.toBeOnTheScreen();
});

it("keeps missing or unusable contacts inert", async () => {
  // Given
  club.contacts = {
    phone: "*123#",
    website: "https://private:password@example.invalid",
  };
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByText(club.club.name);

  // When
  const links = screen.queryAllByRole("link");

  // Then
  expect(links).toHaveLength(0);
  expect(screen.getByText("Commune non renseignée")).toBeOnTheScreen();
  expect(screen.getByText("Non renseigné")).toBeOnTheScreen();
});

it("reports a refused external opening while keeping club information usable", async () => {
  // Given
  club.contacts = { website: "https://club.example.invalid" };
  jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("No handler"));
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();

  // When
  await user.press(
    await screen.findByRole("link", {
      name: "Site web : https://club.example.invalid",
    }),
  );

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Une erreur est survenue. Veuillez réessayer plus tard.",
  );
  expect(screen.getByText(club.club.name)).toBeOnTheScreen();
});

it("hides retained club teams when their parent becomes unavailable", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await user.press(await screen.findByRole("tab", { name: "Équipes" }));
  await screen.findByRole("link", { name: team.team.team.name });
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/clubs/${sportingId}`)
      ? Promise.resolve(Response.json({ status: 404 }, { status: 404 }))
      : reads(url),
  );

  // When
  await act(async () => {
    await client.refetchQueries({
      predicate: (query) => query.queryKey.includes(`/clubs/${sportingId}`),
    });
  });

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Une erreur est survenue",
  );
  expect(screen.queryByText(team.team.team.name)).not.toBeOnTheScreen();
});

it("distinguishes an empty club season from a failed team read", async () => {
  // Given
  let failed = true;
  mockFetch.mockImplementation((url: string) =>
    url.includes("/teams?")
      ? failed
        ? Promise.reject(new TypeError("offline"))
        : Promise.resolve(Response.json({ seasonId: season.id, items: [] }))
      : reads(url),
  );
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await user.press(await screen.findByRole("tab", { name: "Équipes" }));

  // When
  await screen.findByRole("alert");

  // Then
  expect(
    screen.queryByText("Aucune équipe pour cette saison"),
  ).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  // When: a failed initial catalogue is revisited, only its explicit card action may retry.
  await user.press(screen.getByRole("tab", { name: "Infos" }));
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByRole("alert");

  // Then
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/teams?")),
  ).toHaveLength(1);
  failed = false;
  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  // Then
  expect(
    await screen.findByText("Aucune équipe pour cette saison"),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  await user.press(screen.getByRole("button", { name: "Actualiser" }));
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/teams?")),
  ).toHaveLength(3);
});

it("retains a club season's teams after failed pull-to-refresh and retries only that bounded catalogue on another pull", async () => {
  // Given: the club header, selection and accepted team catalogue have their real Query owners.
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByRole("link", { name: team.team.team.name });
  mockFetch
    .mockClear()
    .mockImplementation((url: string) =>
      url.includes("/teams?")
        ? Promise.reject(new TypeError("offline"))
        : reads(url),
    );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert", { name: /Une erreur est survenue/ });

  // Then: the authorized catalogue and independent club identity remain visible with one toast.
  expect(
    screen.getByRole("link", { name: team.team.team.name }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getByText(club.club.name)).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Équipes", selected: true }),
  ).toBeOnTheScreen();

  // When
  mockFetch.mockImplementation(reads);
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("link", { name: team.team.team.name }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.map(([url]) => {
      const target = new URL(url);
      return [target.pathname, target.searchParams.get("seasonId")];
    }),
  ).toEqual([
    [`/clubs/${sportingId}/teams`, season.id],
    [`/clubs/${sportingId}/teams`, season.id],
  ]);
});

it("suppresses a retained team after a current visibility refusal", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<TeamScreen teamId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByText(team.team.team.name);
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/teams/${sportingId}`)
      ? Promise.resolve(
          Response.json({ title: "Unavailable", status: 404 }, { status: 404 }),
        )
      : reads(url),
  );

  // When
  await act(async () => {
    await client.refetchQueries({
      predicate: (q) => q.queryKey.includes(`/teams/${sportingId}`),
    });
  });

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Une erreur est survenue",
  );
  await waitFor(() =>
    expect(screen.queryByText(team.team.team.name)).not.toBeOnTheScreen(),
  );
  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));
  // Then
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it("keeps a team readable when its native public logo fails", async () => {
  // Given
  team.team.team.logoUrl = `/teams/${sportingId}/logo`;
  await renderPage(<TeamScreen teamId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  const image = await screen.findByRole("image", {
    name: `Logo : ${team.team.team.name}`,
  });

  // When
  await fireEvent(image, "error", {
    nativeEvent: { error: "Native decode failed" },
  });

  // Then
  await screen.findByRole("image", {
    name: `Logo indisponible : ${team.team.team.name}`,
  });
  expect(screen.getByText(team.team.team.name)).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/logo")),
  ).toHaveLength(0);
});
it("keeps sharp artwork, classification and the follow action usable when the decorative image fails", async () => {
  // Given: only HTTP and native image events are controlled; the page keeps its actual read owners.
  const user = userEvent.setup();
  const follow = jest.fn();
  team.team.team.logoUrl = `/teams/${sportingId}/logo`;
  team.team.classification = {
    division: {
      id: "00000000-0000-4000-8000-000000000013",
      name: "Division des Deux Rives",
      color: "#168C8C",
      gradient: null,
    },
    format: "6x6",
    gender: "female",
  };
  await renderPage(
    <TeamScreen
      teamId={sportingId}
      renderFollow={() => (
        <Button label="Suivre cette équipe" onPress={follow} />
      )}
    />,
  );
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  const image = await screen.findByRole("image", {
    name: `Logo : ${team.team.team.name}`,
  });
  await fireEvent(image, "display");

  // When
  await fireEvent(screen.getByTestId("sporting-logo-atmosphere"), "error", {
    nativeEvent: { error: "Decorative image decoding failed" },
  });

  // Then
  expect(
    screen.queryByTestId("sporting-logo-atmosphere"),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("image", {
      name: `Logo : ${team.team.team.name}`,
      busy: false,
    }),
  ).toBeOnTheScreen();
  expect(screen.getByText(team.team.team.name)).toBeOnTheScreen();
  expect(screen.getByText("Division des Deux Rives")).toBeOnTheScreen();
  expect(screen.getByText(season.label)).toBeOnTheScreen();
  const action = screen.getByRole("button", { name: "Suivre cette équipe" });
  expect(action).toBeEnabled();

  // When
  await user.press(action);

  // Then: the entity owner still receives the ordinary action, without any extra logo read.
  expect(follow).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/logo")),
  ).toHaveLength(0);
});
it("loads a public logo directly without native caching and unmounts it after its resource is refused", async () => {
  // Given
  team.team.team.logoUrl = `/teams/${sportingId}/logo`;
  await renderPage(<TeamScreen teamId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  const image = await screen.findByRole("image", {
    name: `Logo : ${team.team.team.name}`,
  });
  expect(image).toHaveProp(
    "source",
    expect.arrayContaining([
      { uri: `https://api.example.invalid/teams/${sportingId}/logo` },
    ]),
  );
  expect(image).toHaveProp("cachePolicy", "none");
  expect(screen.getByTestId("sporting-logo-atmosphere")).toBeOnTheScreen();
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith(`/teams/${sportingId}`)
      ? Promise.resolve(Response.json({}, { status: 403 }))
      : reads(url),
  );

  // When
  await act(async () =>
    client.refetchQueries({ queryKey: [`/teams/${sportingId}`], exact: true }),
  );

  // Then
  await waitFor(() =>
    expect(
      screen.queryByRole("image", { name: `Logo : ${team.team.team.name}` }),
    ).not.toBeOnTheScreen(),
  );
  expect(
    screen.queryByTestId("sporting-logo-atmosphere"),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/logo")),
  ).toHaveLength(0);
});
it("shows a new native logo source after the previously published source failed", async () => {
  // Given
  team.team.team.logoUrl = `/teams/${sportingId}/logo?revision=1`;
  await renderPage(<TeamScreen teamId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await fireEvent(
    await screen.findByRole("image", { name: `Logo : ${team.team.team.name}` }),
    "error",
    { nativeEvent: { error: "Native decode failed" } },
  );
  await screen.findByRole("image", {
    name: `Logo indisponible : ${team.team.team.name}`,
  });

  // When
  team = {
    ...team,
    team: {
      ...team.team,
      team: {
        ...team.team.team,
        logoUrl: `/teams/${sportingId}/logo?revision=2`,
      },
    },
  };
  await act(async () =>
    client.refetchQueries({ queryKey: [`/teams/${sportingId}`], exact: true }),
  );

  // Then
  const image = await screen.findByRole("image", {
    name: `Logo : ${team.team.team.name}`,
  });
  expect(image).toHaveProp(
    "source",
    expect.arrayContaining([
      {
        uri: `https://api.example.invalid/teams/${sportingId}/logo?revision=2`,
      },
    ]),
  );
  expect(
    screen.queryByRole("image", {
      name: `Logo indisponible : ${team.team.team.name}`,
    }),
  ).not.toBeOnTheScreen();
});
it("retains the club teams when returning to a visited tab without an implicit reread", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await user.press(await screen.findByRole("tab", { name: "Équipes" }));
  await screen.findByRole("link", { name: team.team.team.name });
  mockFetch.mockClear();

  // When
  await user.press(screen.getByRole("tab", { name: "Infos" }));
  await user.press(screen.getByRole("tab", { name: "Équipes" }));

  // Then
  expect(
    screen.getByRole("link", { name: team.team.team.name }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/teams?")),
  ).toHaveLength(0);
});

it("shows the known match competition independently of a generic pool name", async () => {
  // Given
  match.match.pool.competitionName = "Championnat de démonstration";
  match.match.pool.phaseName = "Phase 2";
  await renderPage(<MatchScreen matchId={sportingId} />);

  // When
  await screen.findByRole("link", {
    name: "Poule : Pool · Championnat de démonstration · Phase 2",
  });

  // Then
  expect(
    screen.getByText("Championnat de démonstration · Phase 2"),
  ).toBeOnTheScreen();
});

it("rereads common club information on a fresh opening while retaining the same QueryClient", async () => {
  // Given
  const opened = await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByText(club.club.name);
  await opened.rerender(<Text>Closed resource</Text>);
  club = {
    ...club,
    club: { ...club.club, name: "Corrected public club" },
    seasons: [olderSeason],
  };
  mockFetch.mockClear();

  // When
  await opened.rerender(<ClubScreen clubId={sportingId} />);

  // Then
  expect(await screen.findByText("Corrected public club")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith(`/clubs/${sportingId}`),
    ),
  ).toHaveLength(1);
});

it("retries a previous common read failure on a fresh resource opening", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/teams/${sportingId}`)
      ? Promise.reject(new TypeError("offline"))
      : reads(url),
  );
  const opened = await renderPage(<TeamScreen teamId={sportingId} />);
  await screen.findByRole("alert");
  await opened.rerender(<Text>Closed resource</Text>);
  mockFetch.mockImplementation(reads);

  // When
  await opened.rerender(<TeamScreen teamId={sportingId} />);

  // Then
  expect(await screen.findByText(team.team.team.name)).toBeOnTheScreen();
});

it.each(["network", "503"])(
  "does not resurrect a forbidden club after a later %s failure",
  async (failure) => {
    // Given
    const user = userEvent.setup();
    await renderPage(<ClubScreen clubId={sportingId} />);
    await screen.findByRole("tab", { name: "À venir" });
    await layoutNativeTabs();
    await screen.findByText(club.club.name);
    mockFetch.mockImplementation((url: string) =>
      url.endsWith(`/clubs/${sportingId}`)
        ? Promise.resolve(Response.json({ status: 404 }, { status: 404 }))
        : reads(url),
    );
    await act(async () => {
      await client.refetchQueries({
        predicate: (query) => query.queryKey.includes(`/clubs/${sportingId}`),
      });
    });
    await screen.findByRole("alert");
    mockFetch.mockImplementation((url: string) =>
      url.endsWith(`/clubs/${sportingId}`)
        ? failure === "network"
          ? Promise.reject(new TypeError("offline"))
          : Promise.resolve(Response.json({ status: 503 }, { status: 503 }))
        : reads(url),
    );

    // When
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Une erreur est survenue",
      ),
    );

    // Then
    expect(screen.queryByText(club.club.name)).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("link", { name: /Téléphone/ }),
    ).not.toBeOnTheScreen();
    mockFetch.mockImplementation(reads);
    // When
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    // Then
    expect(await screen.findByText(club.club.name)).toBeOnTheScreen();
  },
);

it("refreshes the active club team tab only and preserves the selected season", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByText(club.club.name);
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByRole("link", { name: team.team.team.name });
  await user.press(screen.getByRole("button", { name: "Saison 2027/2028" }));
  await user.press(screen.getByRole("button", { name: "2026/2027" }));
  await layoutNativeTabs();
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
  );
  mockFetch.mockClear();

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  const request = new URL(String(mockFetch.mock.calls[0][0]));
  expect(request.pathname).toBe(`/clubs/${sportingId}/teams`);
  expect(request.searchParams.get("seasonId")).toBe(olderSeason.id);
  expect(
    screen.getByRole("button", { name: "Saison 2026/2027" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Équipes", selected: true }),
  ).toBeOnTheScreen();
});

it("opens the generated club-season calendar with its own explicit refresh", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByText(club.club.name);

  // When
  await user.press(screen.getByRole("tab", { name: "À venir" }));

  // Then
  await screen.findByText("Aucun match pour cette sélection");
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  expect(screen.getByRole("button", { name: "Actualiser" })).toBeOnTheScreen();
  const request = mockFetch.mock.calls
    .map(([url]) => new URL(url))
    .find((url) => url.pathname === "/matches");
  expect(request?.searchParams.get("clubId")).toBe(sportingId);
  expect(request?.searchParams.get("seasonId")).toBe(season.id);
  expect(request?.searchParams.get("category")).toBe("upcoming");
});

it.each([
  "https://foreign.example.invalid/logo.png",
  "https://reader:secret@api.example.invalid/logo.png",
  "javascript:alert(1)",
])("keeps an unsafe public logo reference inert: %s", async (logoUrl) => {
  // Given
  team.team.team.logoUrl = logoUrl;

  // When
  await renderPage(<TeamScreen teamId={sportingId} />);
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();

  // Then
  expect(
    await screen.findByRole("image", {
      name: `Logo indisponible : ${team.team.team.name}`,
    }),
  ).toBeOnTheScreen();
  expect(screen.getByText(team.team.team.name)).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/logo")),
  ).toBe(false);
});

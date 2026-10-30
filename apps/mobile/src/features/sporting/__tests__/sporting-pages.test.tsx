import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import type { ReactElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Linking, Pressable, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type {
  ClubDetailResponse,
  TeamDetailResponse,
  PoolDetailResponse,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
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

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
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
  useRouter: () => ({ back: mockBack, push: mockPush, canGoBack: () => true }),
  useNavigation: () => ({ isFocused: () => true }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
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
let client = createQueryClient();
let club: ClubDetailResponse;
let team: TeamDetailResponse;
let pool: PoolDetailResponse;
let match = matchDetail();

/** Controlled HTTP only; the screens use real generated decoders, Query, access and session owners. */
function reads(url: string): Promise<Response> {
  const parsed = new URL(url);
  const path = parsed.pathname;
  if (path.endsWith("/application-access"))
    return Promise.resolve(Response.json(applicationAccessResponse()));
  if (path.endsWith(`/clubs/${sportingId}/teams`))
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
  if (path.endsWith(`/clubs/${sportingId}`))
    return Promise.resolve(Response.json(club));
  if (path.endsWith(`/teams/${sportingId}`))
    return Promise.resolve(Response.json(team));
  if (path.endsWith("/standings"))
    return Promise.resolve(
      Response.json({
        poolId: path.split("/")[2],
        availability: "unavailable",
        lastAttemptFailed: false,
        columns: [],
        rows: [],
      }),
    );
  if (path.endsWith(`/pools/${sportingId}`))
    return Promise.resolve(Response.json(pool));
  if (path.endsWith(`/matches/${sportingId}`))
    return Promise.resolve(Response.json(match));
  if (path === "/matches")
    return Promise.resolve(
      Response.json({
        category: parsed.searchParams.get("category"),
        timeZone: parsed.searchParams.get("timeZone"),
        evaluatedAt: "2026-10-25T12:00:00Z",
        days: [],
      }),
    );
  throw new Error(`Unexpected controlled request ${path}`);
}

beforeEach(() => {
  client = createQueryClient();
  match = matchDetail();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
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
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Supplies the actual application owners without mounting unrelated root navigation/provider SDKs. */
async function renderPage(content: ReactElement) {
  const rendered = await render(content, {
    wrapper: ({ children }) => (
      <GestureHandlerRootView>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, right: 0, bottom: 0, left: 0 },
          }}
        >
          <QueryClientProvider client={client}>
            <ThemeProvider>
              <ActionFeedbackProvider scopeKey="test">
                <ApplicationAccessProvider>
                  <AccountSessionProvider>
                    <AdvertisingProviders>{children}</AdvertisingProviders>
                  </AccountSessionProvider>
                </ApplicationAccessProvider>
              </ActionFeedbackProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    ),
  });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await layoutNativeTabs();
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return rendered;
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
  },
);

it("shares the newest/selected club season between teams and both calendar entries", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByText(club.club.name);

  // When
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();
  await screen.findByRole("link", { name: team.team.team.name });
  await user.press(screen.getByRole("button", { name: "Saison 2027/2028" }));
  await user.press(screen.getByRole("button", { name: "2026/2027" }));
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await layoutNativeTabs();

  // Then
  await screen.findByText("Aucun match pour cette sélection");
  // When
  await user.press(screen.getByRole("tab", { name: "Terminés" }));
  await layoutNativeTabs();
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
  await user.press(screen.getByRole("tab", { name: "Terminés" }));
  await layoutNativeTabs();
  await screen.findByText("Aucun match pour cette sélection");
  const originalPager = screen.getByTestId("native-tabs-pager");

  // When: opening choices does not change the season or dispose its scroll context.
  await user.press(screen.getByRole("button", { name: "Saison 2027/2028" }));

  // Then
  expect(originalPager).toBeOnTheScreen();

  // When: applying another season starts a new native context, not a restoration of the old offset.
  await user.press(screen.getByRole("button", { name: "2026/2027" }));
  await layoutNativeTabs();

  // Then: native pager disposal is observed at its host boundary; RNCT itself remains real.
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
  await screen.findByText(club.club.name);
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();
  await user.press(screen.getByRole("button", { name: "Saison 2027/2028" }));
  await user.press(screen.getByRole("button", { name: "2026/2027" }));
  await layoutNativeTabs();
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
  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison 2027/2028" }),
    ).toBeOnTheScreen(),
  );
});

it("does not replace the selected season with a delayed former team response", async () => {
  // Given
  const formerTeams = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) =>
    url.includes("/teams?seasonId=" + season.id)
      ? formerTeams.promise
      : reads(url),
  );
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByText(club.club.name);
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();
  await user.press(screen.getByRole("button", { name: "Saison 2027/2028" }));

  // When
  await user.press(screen.getByRole("button", { name: "2026/2027" }));
  await layoutNativeTabs();
  await screen.findByRole("link", { name: team.team.team.name });
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
    screen.getByRole("button", { name: "Saison 2026/2027" }),
  ).toBeOnTheScreen();
});

it("keeps a clubless professional team and one follow action across distinct phase tabs", async () => {
  // Given
  const follow = jest.fn();
  const user = userEvent.setup();
  await renderPage(
    <TeamScreen
      teamId={sportingId}
      renderFollow={(identity) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Suivre"
          onPress={() => follow(identity.id)}
        >
          <Text>Suivre</Text>
        </Pressable>
      )}
      renderStandings={(participation) => <Text>{participation.pool.id}</Text>}
    />,
  );

  // When
  await user.press(
    await screen.findByRole("tab", { name: "Classement Pool · Phase finale" }),
  );
  await user.press(screen.getByRole("button", { name: "Suivre" }));

  // Then
  expect(screen.getByText(secondPoolId)).toBeOnTheScreen();
  expect(screen.getAllByRole("button", { name: "Suivre" })).toHaveLength(1);
  expect(follow).toHaveBeenCalledWith(sportingId);
  expect(
    screen.queryByRole("link", { name: /Voir le club/ }),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole("tab", { name: "À venir" })).toBeOnTheScreen();
  expect(screen.getByRole("tab", { name: "Terminés" })).toBeOnTheScreen();
});

it("opens exact club and pool identities without substituting a namesake", async () => {
  // Given
  team = { ...team, team: { ...team.team, club: club.club } };
  const user = userEvent.setup();
  await renderPage(<TeamScreen teamId={sportingId} />);

  // When
  await user.press(
    await screen.findByRole("link", {
      name: "Voir le club Volley des Deux Rives",
    }),
  );
  await user.press(
    screen.getByRole("tab", { name: "Classement Pool · Phase finale" }),
  );
  await user.press(screen.getByRole("link", { name: "Pool · Phase finale" }));

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

  // When
  await user.press(await screen.findByRole("tab", { name: "Carte" }));
  await layoutNativeTabs();

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
    await screen.findByText("Coordonnées");
    mockFetch.mockClear();

    // When
    await user.press(screen.getByRole("tab", { name: label }));
    await layoutNativeTabs();

    // Then: one successful empty state replaces an unavailable seasonal collection.
    expect(
      await screen.findByRole("header", { name: "Aucune saison disponible" }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("Aucune saison disponible")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();

    // When: the accepted empty club is explicitly refreshed.
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then: no Teams or calendar request can be made without a season.
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(new URL(String(mockFetch.mock.calls[0][0])).pathname).toBe(
      `/clubs/${sportingId}`,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
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
            ? "Résultat provisoire · Résultat définitif indisponible"
            : "Résultat non confirmé · Résultat définitif indisponible",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Détail des sets indisponible")).toBeOnTheScreen();
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
  await user.press(await screen.findByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();
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
  await user.press(await screen.findByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();

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
  await layoutNativeTabs();
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
  expect(screen.getByLabelText("Actualiser les données")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/teams?")),
  ).toHaveLength(2);
});

it("retains a club season's teams after failed pull-to-refresh and retries only that bounded catalogue on another pull", async () => {
  // Given: the club header, selection and accepted team catalogue have their real Query owners.
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();
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

it("keeps a team readable when its own logo fails", async () => {
  // Given
  team.team.team.logoUrl = `/teams/${sportingId}/logo`;
  mockFetch.mockImplementation((url: string) =>
    url.includes("/logo")
      ? Promise.reject(new TypeError("offline"))
      : reads(url),
  );
  await renderPage(<TeamScreen teamId={sportingId} />);

  // When
  await screen.findByText("Logo indisponible");

  // Then
  expect(screen.getByText(team.team.team.name)).toBeOnTheScreen();
  expect(screen.getByRole("tab", { name: "À venir" })).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/logo")),
  ).toHaveLength(1);
});

it("retains a usable logo through a failed refresh and clears it after a current refusal", async () => {
  // Given: only native binary conversion and HTTP are controlled; Query retains the representation.
  const previousReader = Object.getOwnPropertyDescriptor(
    globalThis,
    "FileReader",
  );
  /** Completes native binary conversion synchronously; HTTP and Query remain real. */
  class LogoReader {
    static LOADING = 1;
    readyState = 2;
    result = "data:image/png;base64,c3ludGhldGlj";
    onload?: () => void;
    onerror?: () => void;
    /** Supplies a successfully converted image without testing the platform decoder. */
    readAsDataURL() {
      this.onload?.();
    }
  }
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: LogoReader,
  });
  try {
    team.team.team.logoUrl = `/teams/${sportingId}/logo`;
    team.team.team.shortName = "VDR";
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/logo")
        ? Promise.resolve(
            new Response("synthetic", {
              headers: { "Content-Type": "image/png" },
            }),
          )
        : reads(url),
    );
    await renderPage(<TeamScreen teamId={sportingId} />);
    await screen.findByText(team.team.team.name);
    await screen.findByRole("image", { name: `Logo : ${team.team.team.name}` });
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/logo")
        ? Promise.reject(new TypeError("offline"))
        : reads(url),
    );

    // When
    await act(async () => {
      await client.refetchQueries({
        predicate: (query) =>
          query.queryKey.includes(`/teams/${sportingId}/logo`),
      });
    });

    // Then
    expect(
      await screen.findByRole("image", {
        name: `Logo non actualisé : ${team.team.team.name}`,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Logo non actualisé")).toBeOnTheScreen();
    expect(screen.queryByText("VDR")).not.toBeOnTheScreen();
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/logo")
        ? Promise.resolve(Response.json({ status: 404 }, { status: 404 }))
        : reads(url),
    );
    await act(async () => {
      await client.refetchQueries({
        predicate: (query) =>
          query.queryKey.includes(`/teams/${sportingId}/logo`),
      });
    });
    expect(await screen.findByText("Logo indisponible")).toBeOnTheScreen();
    expect(
      screen.getByRole("image", {
        name: `Logo indisponible : ${team.team.team.name}`,
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("VDR")).not.toBeOnTheScreen();
    expect(screen.getByText(team.team.team.name)).toBeOnTheScreen();
  } finally {
    await cleanup();
    if (previousReader)
      Object.defineProperty(globalThis, "FileReader", previousReader);
    else Reflect.deleteProperty(globalThis, "FileReader");
  }
});

it("shows a new valid logo after decoding the previous blob failed", async () => {
  // Given
  const previousReader = Object.getOwnPropertyDescriptor(
    globalThis,
    "FileReader",
  );
  let decodeFails = true;
  /** Controls only native binary decoding; HTTP and Query still replace the actual Blob. */
  class LogoReader {
    static LOADING = 1;
    readyState = 2;
    result = "data:image/png;base64,cmVjb3ZlcmVk";
    onload?: () => void;
    onerror?: () => void;
    /** Reports the scenario's current native decoding result. */
    readAsDataURL() {
      if (decodeFails) this.onerror?.();
      else this.onload?.();
    }
  }
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: LogoReader,
  });
  try {
    team.team.team.logoUrl = `/teams/${sportingId}/logo`;
    team.team.team.shortName = "VDR";
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/logo")
        ? Promise.resolve(
            new Response("synthetic", {
              headers: { "Content-Type": "image/png" },
            }),
          )
        : reads(url),
    );
    await renderPage(<TeamScreen teamId={sportingId} />);
    await screen.findByText("Logo indisponible");

    // When
    decodeFails = false;
    await act(async () => {
      await client.refetchQueries({
        predicate: (query) =>
          query.queryKey.includes(`/teams/${sportingId}/logo`),
      });
    });

    // Then
    expect(
      await screen.findByRole("image", {
        name: `Logo : ${team.team.team.name}`,
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Logo indisponible")).not.toBeOnTheScreen();
    expect(screen.getByText(team.team.team.name)).toBeOnTheScreen();
    expect(screen.queryByText("VDR")).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/logo"),
      ),
    ).toHaveLength(2);
  } finally {
    await cleanup();
    if (previousReader)
      Object.defineProperty(globalThis, "FileReader", previousReader);
    else Reflect.deleteProperty(globalThis, "FileReader");
  }
});

it("retains the club teams when returning to a visited tab without an implicit reread", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await user.press(await screen.findByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();
  await screen.findByRole("link", { name: team.team.team.name });
  mockFetch.mockClear();

  // When
  await user.press(screen.getByRole("tab", { name: "Infos" }));
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();

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
  await screen.findByText(club.club.name);
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await layoutNativeTabs();
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
  await screen.findByText(club.club.name);

  // When
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await layoutNativeTabs();

  // Then
  await screen.findByText("Aucun match pour cette sélection");
  expect(screen.getByLabelText("Actualiser les données")).toBeOnTheScreen();
  const request = mockFetch.mock.calls
    .map(([url]) => new URL(url))
    .find((url) => url.pathname === "/matches");
  expect(request?.searchParams.get("clubId")).toBe(sportingId);
  expect(request?.searchParams.get("seasonId")).toBe(season.id);
  expect(request?.searchParams.get("category")).toBe("upcoming");
});

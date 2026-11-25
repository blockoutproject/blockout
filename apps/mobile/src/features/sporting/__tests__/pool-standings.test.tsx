import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
} from "react";
import {
  onlineManager,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { layoutNativeTabs } from "@/shared/native/test-support/tab-view-native";
import { AdvertisingProviders } from "@/features/advertising/test-support/advertising-providers";
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

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { PoolStandingsResponse } from "../../../../.generated/schemas/index.zod";
import { getGetPoolStandingsQueryKey } from "../../../../.generated/mobile";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { ActionFeedbackProvider } from "@/shared/components/action-feedback";
import { PagedTabs } from "@/shared/components/paged-tabs";
import { AccountSessionProvider } from "@/features/accounts/session/account-session-provider";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { mockAuth0 } from "@/features/accounts/test-support/native-auth0";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { matchDetail, sportingId } from "../test-support/consultation-data";
import { PoolScreen } from "../screens/pool-screen";
import { TeamScreen } from "../screens/team-screen";
import { PoolStandings } from "../components/pool-standings";
import {
  TECHNICAL_ERROR,
  TECHNICAL_ERROR_TITLE,
} from "@/shared/components/error-copy";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
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
  // This isolated panel controls the native navigation boundary; motion is qualified on device.
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual("react").useEffect(effect, [effect]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
  useIsFocused: () => true,
  useNavigation: () => ({ isFocused: () => true }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
const environment = { ...process.env };
const pool = matchDetail().match.pool;
const divisionColor = pool.classification.division?.color;
const otherTeam = "00000000-0000-4000-8000-000000002092";
let client: QueryClient;
let publicClient = createQueryClient();
let table: PoolStandingsResponse;
let failed = false;

/** Retrieves the real private lifetime client; failure scenarios explicitly disable read retries. */
function PrivateQueries({ children }: Readonly<QueryFixtureProps>) {
  const current = useQueryClient();
  // Configure this fresh real client before descendant public observers start their first request.
  useQueryFixtureState(() => {
    current.setQueryDefaults([], { retry: false });
    return true;
  });
  useLayoutEffect(() => {
    client = current;
  }, [current]);
  return children;
}

beforeEach(() => {
  publicClient = createQueryClient();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  mockPush.mockReset();
  failed = false;
  table = {
    poolId: pool.pool.id,
    availability: "available",
    observedAt: "2026-10-20T12:00:00Z",
    columns: ["Jou.", "Pts"],
    rows: [
      {
        sourceName: "Official Z",
        position: 7,
        team: { id: sportingId, name: "Effective Z" },
        statistics: { "Jou.": "4", Pts: "18" },
      },
      { sourceName: "Unmatched", statistics: { "Jou.": "\u2014" } },
      {
        sourceName: "Official A",
        position: 2,
        team: { id: otherTeam, name: "Effective A" },
        statistics: { Pts: "0" },
      },
    ],
  };
  mockFetch.mockReset().mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/application-access") {
      return Promise.resolve(Response.json(applicationAccessResponse()));
    }
    if (parsed.pathname.endsWith("/standings")) {
      return failed
        ? Promise.resolve(Response.json({}, { status: 503 }))
        : Promise.resolve(Response.json(table));
    }
    if (parsed.pathname === `/pools/${pool.pool.id}`) {
      return Promise.resolve(Response.json({ pool }));
    }
    if (parsed.pathname === `/teams/${sportingId}`) {
      return Promise.resolve(
        Response.json({
          team: {
            team: { id: sportingId, name: "Team" },
            season: pool.season,
            classification: {},
            professional: false,
          },
          participations: [pool],
        }),
      );
    }
    if (parsed.pathname === "/matches") {
      return Promise.resolve(
        Response.json({
          category: parsed.searchParams.get("category"),
          timeZone: parsed.searchParams.get("timeZone"),
          evaluatedAt: "2026-10-28T12:00:00Z",
          days: [],
        }),
      );
    }
    return Promise.reject(
      new Error(`Unexpected synthetic path ${parsed.pathname}`),
    );
  });
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  onlineManager.setOnline(true);
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Real cache, generated decoder, theme, session and admission; only native/HTTP boundaries are controlled. */
function open(
  content = (
    <PoolStandings
      poolId={pool.pool.id}
      divisionColor={divisionColor}
      highlightTeamId={sportingId}
    />
  ),
) {
  return render(content, {
    wrapper: ({ children }: Readonly<QueryFixtureProps>) => (
      <GestureHandlerRootView>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, left: 0, right: 0, bottom: 0 },
          }}
        >
          <QueryClientProvider client={publicClient}>
            <ThemeProvider>
              <ActionFeedbackProvider scopeKey="standings-test">
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
  });
}

/** Supplies the official native scroll owner for an isolated standings panel. */
function panel(refreshEmpty = true) {
  return (
    <PagedTabs
      selected="standings"
      onSelect={() => undefined}
      tabs={[
        {
          id: "standings",
          label: "Classement",
          content: (
            <PoolStandings
              poolId={pool.pool.id}
              divisionColor={divisionColor}
              highlightTeamId={sportingId}
              refreshEmpty={refreshEmpty}
            />
          ),
        },
      ]}
    />
  );
}

it("numbers each published list row and preserves official labels and statistics", async () => {
  // Given
  const user = userEvent.setup();
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();

  // When
  await user.press(await screen.findByRole("link", { name: /Official Z/ }));

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/teams/[teamId]",
    params: { teamId: sportingId },
  });
  expect(screen.getByLabelText("Rang 1")).toHaveTextContent("1");
  expect(screen.getByLabelText("Rang 2")).toHaveTextContent("2");
  expect(screen.getByLabelText("Rang 3")).toHaveTextContent("3");
  expect(screen.getByText("4")).toBeOnTheScreen();
  expect(screen.getByText("Unmatched")).toBeOnTheScreen();
  expect(
    screen.getByRole("image", { name: "Logo absent : Unmatched" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /Unmatched/ })).toBeNull();
  expect(screen.getAllByText("0")).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: /Official Z\. Rang 1/, selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Official A\. Rang 3/, selected: false }),
  ).toBeOnTheScreen();
});

it.each([
  ["available", "Aucune équipe dans ce classement", "header"],
  ["not-published", "Pas de classement pour cette phase", "header"],
  ["unavailable", TECHNICAL_ERROR_TITLE, "alert"],
] as const)(
  "presents an adapted state card for %s",
  async (availability, message, role) => {
    // Given
    table = {
      poolId: pool.pool.id,
      availability,
      columns: [],
      rows: [],
      ...(availability === "available"
        ? { observedAt: "2026-10-20T12:00:00Z" }
        : {}),
    };

    // When
    await open(panel());
    await screen.findByRole("tab", { name: "Classement" });
    await layoutNativeTabs();

    // Then
    expect(await screen.findByRole(role, { name: message })).toBeOnTheScreen();
    expect(screen.queryByText(/Observé le|Date d’observation/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Réessayer" }) !== null).toBe(
      availability === "unavailable",
    );
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
    if (availability !== "unavailable") {
      mockFetch.mockClear();

      // When: an empty table reloads through its card, without a refresh gesture or a new selection.
      await userEvent.press(screen.getByRole("button", { name: "Actualiser" }));

      // Then
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      expect(new URL(mockFetch.mock.calls[0][0]).pathname).toBe(
        `/pools/${pool.pool.id}/standings`,
      );
      await screen.findByRole("button", { name: "Actualiser", busy: false });
      expect(screen.getByRole(role, { name: message })).toBeOnTheScreen();
    }
  },
);

it("replaces failed standings and their controls while retaining the authorized Query data", async () => {
  // Given
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();
  await screen.findByText("Official Z");
  failed = true;

  // When
  await fireEvent(
    await screen.findByLabelText("Actualiser les données"),
    "refresh",
  );

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Official Z")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("radio", { name: "Afficher en cartes" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByText(
      /Observé le|Dernière actualisation|conservées restent affichées/,
    ),
  ).toBeNull();
  expect(
    client
      .getQueryCache()
      .findAll()
      .find((query) => String(query.queryKey[0]).endsWith("/standings"))?.state
      .data,
  ).toEqual(table);
});

it.each(["available", "not-published"] as const)(
  "replaces a cached %s empty table with a retryable read error",
  async (availability) => {
    // Given
    table = { ...table, availability, rows: [] };
    await open(panel());
    await screen.findByRole("tab", { name: "Classement" });
    await layoutNativeTabs();
    await screen.findByRole("button", { name: "Actualiser" });
    failed = true;

    // When
    await userEvent.press(screen.getByRole("button", { name: "Actualiser" }));

    // Then
    expect(
      await screen.findByRole("button", { name: "Réessayer" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Aucune équipe dans ce classement")).toBeNull();
    expect(screen.queryByText("Pas de classement pour cette phase")).toBeNull();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    failed = false;

    // When
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(
      await screen.findByRole("button", { name: "Actualiser", busy: false }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();
  },
);

it("loads team participation standings lazily and preserves them through calendar refresh", async () => {
  // Given
  const user = userEvent.setup();
  await open(<TeamScreen teamId={sportingId} />);
  await screen.findAllByRole("tab", { includeHiddenElements: true });
  await layoutNativeTabs();
  expect(
    await screen.findByRole("tab", { name: "À venir", selected: true }),
  ).toBeOnTheScreen();
  await screen.findByText("Aucun match pour cette sélection");
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/standings"),
    ),
  ).toHaveLength(0);
  await user.press(screen.getByRole("tab", { name: pool.pool.name }));
  await screen.findByText("Official Z");
  const initial = mockFetch.mock.calls.filter(([url]) =>
    new URL(url).pathname.endsWith("/standings"),
  ).length;

  // When
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findByText("Aucun match pour cette sélection");
  expect(screen.getByLabelText("Actualiser les données")).toBeDisabled();
  await user.press(screen.getByRole("button", { name: "Actualiser" }));
  await user.press(screen.getByRole("tab", { name: pool.pool.name }));

  // Then
  expect(await screen.findByText("Official Z")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/standings"),
    ),
  ).toHaveLength(initial);
});

it("keeps an admitted pool calendar usable after its standings refresh fails", async () => {
  // Given
  const user = userEvent.setup();
  await open(<PoolScreen poolId={pool.pool.id} />);
  await screen.findAllByRole("tab", { includeHiddenElements: true });
  await layoutNativeTabs();
  await screen.findByRole("tab", { name: "Classement" });
  await screen.findByText("Official Z");
  failed = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert", { name: TECHNICAL_ERROR_TITLE });
  expect(screen.queryByText("Official Z")).not.toBeOnTheScreen();

  // When
  await user.press(await screen.findByRole("tab", { name: "À venir" }));

  // Then
  expect(
    await screen.findByText("Aucun match pour cette sélection"),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      new URL(url).pathname.endsWith("/participants"),
    ),
  ).toBe(false);
});

it("numbers Team cards without printed ranks, a standings refetch or team emphasis", async () => {
  // Given
  const user = userEvent.setup();
  table.rows = table.rows.map(({ sourceName, team, statistics }) => ({
    sourceName,
    team,
    statistics,
  }));
  await open(<TeamScreen teamId={sportingId} />);
  await screen.findAllByRole("tab", { includeHiddenElements: true });
  await layoutNativeTabs();
  await user.press(await screen.findByRole("tab", { name: pool.pool.name }));
  expect(
    await screen.findByRole("link", { name: /Official Z\. Rang 1/ }),
  ).toBeOnTheScreen();
  const reads = mockFetch.mock.calls.length;

  // When
  await user.press(screen.getByRole("radio", { name: "Afficher en cartes" }));

  // Then
  expect(
    screen.getByRole("radio", { name: "Afficher en cartes", checked: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Official Z\. Rang 1.*Jou\. : 4/ }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText(/^Unmatched\. Rang 2/)).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Official A\. Rang 3/ }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("image", { name: "Logo absent : Unmatched" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /Unmatched/ })).toBeNull();
  expect(screen.queryByRole("link", { selected: true })).toBeNull();
  const requestedPaths = mockFetch.mock.calls
    .slice(reads)
    .map(([url]) => new URL(url).pathname);
  expect(requestedPaths).not.toContain(`/pools/${pool.pool.id}/standings`);
});

it("keeps the displayed podium logo through cards and back to the list", async () => {
  // Given
  const user = userEvent.setup();
  table.rows[0] = {
    ...table.rows[0],
    team: {
      id: sportingId,
      name: "Effective Z",
      logoUrl: `/teams/${sportingId}/logo`,
    },
  };
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();
  const name = "Logo : Effective Z";
  const logo = await screen.findByRole("image", { name, busy: true });
  await fireEvent(logo, "display");

  // When
  await user.press(screen.getByRole("radio", { name: "Afficher en cartes" }));

  // Then
  expect(screen.getByRole("image", { name, busy: false })).toBeOnTheScreen();
  expect(screen.getByTestId("sporting-logo-atmosphere")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("radio", { name: "Afficher en liste" }));

  // Then
  expect(screen.getByRole("image", { name, busy: false })).toBeOnTheScreen();
  expect(screen.queryByTestId("sporting-logo-atmosphere")).toBeNull();
});

it("loads a replacement logo without remounting its team link", async () => {
  // Given
  const team = {
    id: sportingId,
    name: "Effective Z",
    logoUrl: `/teams/${sportingId}/logo`,
  };
  table.rows[0] = { ...table.rows[0], team };
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();
  const link = await screen.findByRole("link", { name: /Official Z\. Rang 1/ });
  const name = `Logo : ${team.name}`;
  await fireEvent(screen.getByRole("image", { name, busy: true }), "display");

  // When
  table.rows[0] = {
    ...table.rows[0],
    team: { ...team, logoUrl: `${team.logoUrl}?revision=2` },
  };
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  const replacement = await screen.findByRole("image", { name, busy: true });
  expect(link).toBeOnTheScreen();
  await fireEvent(replacement, "display");
  expect(screen.getByRole("image", { name, busy: false })).toBeOnTheScreen();
});

it("keeps Pool row numbers through the 2-1-3 card layout even with irregular printed ranks", async () => {
  // Given: two rows share a printed rank and points, and the unlinked row has the most points.
  const user = userEvent.setup();
  table.rows = [
    table.rows[0],
    { ...table.rows[1], statistics: { Pts: "24" } },
    { ...table.rows[2], position: 7, statistics: { Pts: "18" } },
    { sourceName: "Fourth", position: 1, statistics: { Pts: "12" } },
    { sourceName: "Fifth", statistics: { Pts: "16" } },
  ];
  await open(<PoolScreen poolId={pool.pool.id} />);
  await screen.findAllByRole("tab", { includeHiddenElements: true });
  await layoutNativeTabs();
  await screen.findByRole("tab", { name: "Classement" });
  await screen.findByRole("link", { name: /Official Z\. Rang 1/ });
  expect(screen.getAllByLabelText(/^Rang \d+$/)).toEqual([
    screen.getByLabelText("Rang 1"),
    screen.getByLabelText("Rang 2"),
    screen.getByLabelText("Rang 3"),
    screen.getByLabelText("Rang 4"),
    screen.getByLabelText("Rang 5"),
  ]);

  // When
  await user.press(
    await screen.findByRole("radio", { name: "Afficher en cartes" }),
  );

  // Then
  const unlinked = screen.getByLabelText(/^Unmatched\. Rang 2.*Pts : 24/);
  expect(screen.getAllByLabelText(/\. Rang \d/)).toEqual([
    unlinked,
    screen.getByRole("link", { name: /^Official Z\. Rang 1/ }),
    screen.getByRole("link", { name: /^Official A\. Rang 3/ }),
    screen.getByLabelText(/^Fourth\. Rang 4/),
    screen.getByLabelText(/^Fifth\. Rang 5/),
  ]);
  expect(within(unlinked).getByText("2")).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /Unmatched/ })).toBeNull();
});

it("keeps a two-row table in source order in cards", async () => {
  // Given
  const user = userEvent.setup();
  table.rows = [table.rows[0], table.rows[2]];
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();

  // When
  await user.press(
    await screen.findByRole("radio", { name: "Afficher en cartes" }),
  );

  // Then
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(2);
  expect(links[0]).toHaveAccessibleName(/^Official Z\. Rang 1/);
  expect(links[1]).toHaveAccessibleName(/^Official A\. Rang 2/);
});

it("retries an initial failure without announcing a successful empty table", async () => {
  // Given
  failed = true;
  const user = userEvent.setup();
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();
  await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.queryByRole("header", { name: "Aucune équipe dans ce classement" }),
  ).toBeNull();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  failed = false;
  mockFetch.mockClear();

  // When
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Official Z")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.endsWith("/standings"),
    ),
  ).toHaveLength(1);
  expect(screen.getByLabelText("Actualiser les données")).toBeOnTheScreen();
});

it("keeps the initial pool error and its active Retry when returning from another tab", async () => {
  // Given: the exact standings read fails before any table has been admitted.
  failed = true;
  const user = userEvent.setup();
  await open(<PoolScreen poolId={pool.pool.id} />);
  await screen.findAllByRole("tab", { includeHiddenElements: true });
  await layoutNativeTabs();
  await screen.findByRole("button", { name: "Réessayer", busy: false });
  const retried = Promise.withResolvers<Response>();
  mockFetch.mockClear().mockImplementationOnce(() => retried.promise);

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findByText("Aucun match pour cette sélection");
  await user.press(screen.getByRole("tab", { name: "Classement" }));

  // Then: the mounted scene rejoins its read instead of replacing the card with a skeleton.
  expect(
    screen.getByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeBusy();
  expect(
    screen.queryByRole("progressbar", { name: "Chargement du classement" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("radio", { name: "Afficher en cartes" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Classement", selected: true }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/standings"),
    ),
  ).toHaveLength(1);

  // When
  await act(async () => retried.resolve(Response.json(table)));

  // Then
  expect(await screen.findByText("Official Z")).toBeOnTheScreen();
  expect(
    screen.getByRole("radio", { name: "Afficher en liste", checked: true }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it("masks a background table failure without losing the selected presentation", async () => {
  // Given
  const user = userEvent.setup();
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();
  await user.press(
    await screen.findByRole("radio", { name: "Afficher en cartes" }),
  );
  failed = true;

  // When: native Query invalidation fails without any explicit read gesture.
  await act(async () =>
    client.invalidateQueries({
      queryKey: getGetPoolStandingsQueryKey(pool.pool.id),
      exact: true,
    }),
  );

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).not.toBeBusy();
  expect(
    screen.queryByRole("radio", { name: "Afficher en cartes" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText("Official Z")).not.toBeOnTheScreen();

  // When
  failed = false;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("radio", {
      name: "Afficher en cartes",
      checked: true,
    }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Official Z")).toBeOnTheScreen();
});

it("keeps a paused table Retry non-busy and resumes the same safe read", async () => {
  // Given: the adopted table has failed after displaying authorized rows.
  const user = userEvent.setup();
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();
  await screen.findByText("Official Z");
  failed = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("button", { name: "Réessayer", busy: false });
  await act(() => onlineManager.setOnline(false));
  failed = false;
  mockFetch.mockClear();

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    screen.getByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).not.toBeBusy();
  expect(
    screen.queryByRole("progressbar", { name: "Chargement du classement" }),
  ).not.toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();

  // When
  await act(() => onlineManager.setOnline(true));

  // Then
  expect(await screen.findByText("Official Z")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/standings"),
    ),
  ).toHaveLength(1);
});

it.each([
  { availability: "available", title: "Aucune équipe dans ce classement" },
  {
    availability: "not-published",
    title: "Pas de classement pour cette phase",
  },
] as const)(
  "shows the Pool $availability empty card without a refresh action",
  async ({ availability, title }) => {
    // Given
    table = { ...table, availability, rows: [] };

    // When
    await open(panel(false));
    await screen.findByRole("tab", { name: "Classement" });
    await layoutNativeTabs();

    // Then: successful Empty has neither a standing refresh command nor a competing pull gesture.
    expect(
      await screen.findByRole("header", { name: title }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Actualiser" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText("Actualiser les données"),
    ).not.toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  },
);

it("keeps declared table unavailability successful and retries it only explicitly", async () => {
  // Given
  table = { ...table, availability: "unavailable", rows: [] };
  const user = userEvent.setup();
  await open(panel(false));
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();
  await screen.findByRole("button", { name: "Réessayer", busy: false });

  // Then: HTTP 200 business unavailability never enters the automatic failure-retry policy.
  expect(
    client.getQueryState(getGetPoolStandingsQueryKey(pool.pool.id))?.status,
  ).toBe("success");
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/standings"),
    ),
  ).toHaveLength(1);

  // When
  table = { ...table, availability: "not-published" };
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("header", {
      name: "Pas de classement pour cette phase",
    }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Actualiser" }),
  ).not.toBeOnTheScreen();
});

it.each(["unavailable", "not-published"] as const)(
  "keeps %s honest when its available recovery action fails",
  async (availability) => {
    // Given
    table = {
      poolId: pool.pool.id,
      availability,
      columns: [],
      rows: [],
    };
    await open(panel());
    await screen.findByRole("tab", { name: "Classement" });
    await layoutNativeTabs();
    // Query can finish before React commits its notified read state; wait for the actual recovery control.
    if (availability === "unavailable") {
      await screen.findByRole("button", { name: "Réessayer" });
    } else {
      await screen.findByRole("button", { name: "Actualiser" });
    }
    failed = true;
    mockFetch.mockClear();

    // When
    if (availability === "unavailable") {
      expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
      await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
    } else {
      await userEvent.press(screen.getByRole("button", { name: "Actualiser" }));
    }

    // Then
    expect(
      await screen.findByRole("alert", {
        name: TECHNICAL_ERROR_TITLE,
      }),
    ).toBeOnTheScreen();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await screen.findByRole("button", { name: "Réessayer", busy: false });
    expect(screen.queryByRole("alert", { name: TECHNICAL_ERROR })).toBeNull();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(String(url)).pathname.endsWith("/standings"),
      ),
    ).toHaveLength(1);
    expect(
      screen.queryByText(/Dernière actualisation|conservées restent affichées/),
    ).toBeNull();
  },
);

it.each(["list", "cards"] as const)(
  "limits %s standings and accessible labels to Pts and J/G/P",
  async (layout) => {
    // Given
    const user = userEvent.setup();
    table.columns = [
      "Points",
      "Matchs / Joués",
      "Matchs / Gagnés",
      "Matchs / Perdus",
      "Résultats / 3-0",
      "Ratio sets",
    ];
    table.rows = [
      {
        sourceName: "Official compact team",
        position: 1,
        team: { id: sportingId, name: "Effective team" },
        statistics: {
          Points: "18",
          "Matchs / Joués": "9",
          "Matchs / Gagnés": "6",
          "Matchs / Perdus": "3",
          "Résultats / 3-0": "999",
          "Ratio sets": "888",
        },
      },
    ];
    await open(panel());
    await screen.findByRole("tab", { name: "Classement" });
    await layoutNativeTabs();
    await screen.findByRole("link", { name: /Official compact team/ });

    // When
    if (layout === "cards") {
      await user.press(
        screen.getByRole("radio", { name: "Afficher en cartes" }),
      );
    }

    // Then
    expect(screen.getByText("Pts")).toBeOnTheScreen();
    for (const label of ["J", "G", "P"]) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    for (const value of ["18", "9", "6", "3"]) {
      expect(screen.getByText(value)).toBeOnTheScreen();
    }
    expect(screen.queryByText("999")).not.toBeOnTheScreen();
    expect(table.rows[0].statistics["Résultats / 3-0"]).toBe("999");
    expect(table.columns).toContain("Ratio sets");
    expect(screen.queryByText("888")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("link", { name: /Résultats \/ 3-0|Ratio sets/ }),
    ).not.toBeOnTheScreen();
  },
);

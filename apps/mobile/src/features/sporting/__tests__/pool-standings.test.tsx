import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { PoolStandingsResponse } from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { PagedTabs } from "../../../shared/components/paged-tabs";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { matchDetail, sportingId } from "../test-support/consultation-data";
import { PoolScreen } from "../screens/pool-screen";
import { TeamScreen } from "../screens/team-screen";
import { PoolStandings } from "../components/pool-standings";
import {
  TECHNICAL_ERROR,
  TECHNICAL_ERROR_TITLE,
} from "../../../shared/components/error-copy";

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
  // This isolated panel controls the native navigation boundary; motion is qualified on device.
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual("react").useEffect(effect, [effect]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
  useNavigation: () => ({ isFocused: () => true }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
const environment = { ...process.env };
const pool = matchDetail().match.pool;
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
    lastAttemptFailed: false,
    columns: ["Jou.", "Pts"],
    rows: [
      {
        sourceName: "Official Z",
        position: 7,
        team: { id: sportingId, name: "Effective Z" },
        statistics: { "Jou.": "4", Pts: "18" },
      },
      { sourceName: "Unmatched", statistics: { "Jou.": "—" } },
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
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Real cache, generated decoder, theme, session and admission; only native/HTTP boundaries are controlled. */
function open(
  content = <PoolStandings pool={pool} highlightTeamId={sportingId} />,
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
function panel() {
  return (
    <PagedTabs
      selected="standings"
      onSelect={() => undefined}
      tabs={[
        {
          id: "standings",
          label: "Classement",
          content: <PoolStandings pool={pool} highlightTeamId={sportingId} />,
        },
      ]}
    />
  );
}

it("preserves official labels positions and missing values without guessed links", async () => {
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
  expect(screen.getByText("7")).toBeOnTheScreen();
  expect(screen.getByText("4")).toBeOnTheScreen();
  expect(screen.getByText("Unmatched")).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /Unmatched/ })).toBeNull();
  expect(screen.queryByText("1")).toBeNull();
  expect(screen.getAllByText("0")).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: /Official Z/, selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Official A/, selected: false }),
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
      lastAttemptFailed: false,
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
    expect(
      screen.queryByText(/Observé le|Date d’observation|Dernière acquisition/),
    ).toBeNull();
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

it("retains source metadata silently after a failed explicit refresh", async () => {
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
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(screen.getByText("Official Z")).toBeOnTheScreen();
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
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

it("keeps acquisition diagnostics out of the usable table presentation", async () => {
  // Given
  table.lastAttemptFailed = true;

  // When
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();

  // Then
  expect(await screen.findByText("Official Z")).toBeOnTheScreen();
  expect(
    screen.queryByText(/Observé le|Dernière acquisition|conservées/),
  ).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("loads team participation standings lazily and preserves them through calendar refresh", async () => {
  // Given
  const user = userEvent.setup();
  await open(<TeamScreen teamId={sportingId} />);
  await screen.findAllByRole("tab", { includeHiddenElements: true });
  await layoutNativeTabs();
  await screen.findByRole("tab", { name: pool.pool.name });
  await screen.findByText("Official Z");
  const initial = mockFetch.mock.calls.filter(([url]) =>
    new URL(url).pathname.endsWith("/standings"),
  ).length;

  // When
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findByText("Aucun match pour cette sélection");
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
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
  await screen.findByRole("alert", { name: TECHNICAL_ERROR });
  expect(screen.getByText("Official Z")).toBeOnTheScreen();

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

it("switches to the approved cards without another read or team emphasis", async () => {
  // Given
  const user = userEvent.setup();
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();
  await screen.findByText("Official Z");
  const reads = mockFetch.mock.calls.length;

  // When
  await user.press(screen.getByRole("radio", { name: "Afficher en cartes" }));

  // Then
  expect(
    screen.getByRole("radio", { name: "Afficher en cartes", checked: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Official Z.*Jou\. : 4/ }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Unmatched")).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /Unmatched/ })).toBeNull();
  expect(screen.queryByRole("link", { selected: true })).toBeNull();
  expect(mockFetch).toHaveBeenCalledTimes(reads);
});

it("projects only official podium ranks as 2–1–3 and preserves the remaining order", async () => {
  // Given
  const user = userEvent.setup();
  table.rows = [
    table.rows[0],
    { ...table.rows[2], position: 1 },
    {
      sourceName: "Third",
      position: 3,
      statistics: { Pts: "9" },
      team: { id: "00000000-0000-4000-8000-000000002093", name: "Third" },
    },
    {
      sourceName: "Second",
      position: 2,
      statistics: { Pts: "12" },
      team: { id: "00000000-0000-4000-8000-000000002094", name: "Second" },
    },
    table.rows[1],
  ];
  const sourceOrder = table.rows.map((row) => row.sourceName);
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();

  // When
  await user.press(
    await screen.findByRole("radio", { name: "Afficher en cartes" }),
  );

  // Then
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(4);
  expect(links[0]).toHaveAccessibleName(/^Second(?:\.|$)/);
  expect(links[1]).toHaveAccessibleName(/^Official A(?:\.|$)/);
  expect(links[2]).toHaveAccessibleName(/^Third(?:\.|$)/);
  expect(links[3]).toHaveAccessibleName(/^Official Z(?:\.|$)/);
  expect(
    client
      .getQueryCache()
      .findAll()
      .find((query) => String(query.queryKey[0]).endsWith("/standings"))?.state
      .data,
  ).toMatchObject({ rows: sourceOrder.map((sourceName) => ({ sourceName })) });
  expect(screen.getByText("Unmatched")).toBeOnTheScreen();
});

it("keeps ambiguous podium ranks in source order without inventing a place", async () => {
  // Given
  const user = userEvent.setup();
  table.rows = [
    table.rows[0],
    { ...table.rows[2], position: 1 },
    { sourceName: "Also first", position: 1, statistics: {} },
    { sourceName: "Second", position: 2, statistics: {} },
    { sourceName: "Third", position: 3, statistics: {} },
  ];
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
  expect(links[0]).toHaveAccessibleName(/^Official Z(?:\.|$)/);
  expect(links[1]).toHaveAccessibleName(/^Official A(?:\.|$)/);
  expect(screen.getByText("Also first")).toBeOnTheScreen();
  expect(screen.getByText("Second")).toBeOnTheScreen();
  expect(screen.getByText("Third")).toBeOnTheScreen();
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

it("does not claim retained table information after a first failed acquisition", async () => {
  // Given
  table = {
    poolId: pool.pool.id,
    availability: "unavailable",
    lastAttemptFailed: true,
    columns: [],
    rows: [],
  };

  // When
  await open(panel());
  await screen.findByRole("tab", { name: "Classement" });
  await layoutNativeTabs();

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText(/Dernière acquisition|conservées restent affichées/),
  ).toBeNull();
});

it.each(["unavailable", "not-published"] as const)(
  "keeps %s honest when its available recovery action fails",
  async (availability) => {
    // Given
    table = {
      poolId: pool.pool.id,
      availability,
      lastAttemptFailed: false,
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

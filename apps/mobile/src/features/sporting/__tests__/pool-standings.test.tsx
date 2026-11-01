import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import "../../../shared/native/test-support/tab-view-native";
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
function PrivateQueries({ children }: QueryFixtureProps) {
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
    columns: ["Ratio", "Pts"],
    rows: [
      {
        sourceName: "Official Z",
        position: 7,
        team: { id: sportingId, name: "Effective Z" },
        statistics: { Ratio: "∞", Pts: "18" },
      },
      { sourceName: "Unmatched", statistics: { Ratio: "—" } },
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
    if (parsed.pathname === "/application-access")
      return Promise.resolve(Response.json(applicationAccessResponse()));
    if (parsed.pathname.endsWith("/standings"))
      return failed
        ? Promise.resolve(Response.json({}, { status: 503 }))
        : Promise.resolve(Response.json(table));
    if (parsed.pathname === `/pools/${pool.pool.id}`)
      return Promise.resolve(Response.json({ pool }));
    if (parsed.pathname === `/teams/${sportingId}`)
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
    if (parsed.pathname === "/matches")
      return Promise.resolve(
        Response.json({
          category: parsed.searchParams.get("category"),
          timeZone: parsed.searchParams.get("timeZone"),
          evaluatedAt: "2026-10-28T12:00:00Z",
          days: [],
        }),
      );
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
async function open(
  content = <PoolStandings pool={pool} highlightTeamId={sportingId} />,
) {
  const result = await render(content, {
    wrapper: ({ children }) => (
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
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return result;
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

  // When
  await user.press(await screen.findByRole("link", { name: /Official Z/ }));

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/teams/[teamId]",
    params: { teamId: sportingId },
  });
  expect(screen.getByText("7")).toBeOnTheScreen();
  expect(screen.getByText("∞")).toBeOnTheScreen();
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

    // Then
    expect(await screen.findByRole(role, { name: message })).toBeOnTheScreen();
    expect(
      screen.queryByText(/Observé le|Date d’observation|Dernière acquisition/),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Réessayer" }) !== null).toBe(
      availability === "unavailable",
    );
    expect(screen.queryByLabelText("Actualiser les données") !== null).toBe(
      availability !== "unavailable",
    );
  },
);

it("retains source metadata silently after a failed explicit refresh", async () => {
  // Given
  await open(panel());
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

it("keeps acquisition diagnostics out of the usable table presentation", async () => {
  // Given
  table.lastAttemptFailed = true;

  // When
  await open(panel());

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
  await screen.findByText("Official Z");
  const initial = mockFetch.mock.calls.filter(([url]) =>
    new URL(url).pathname.endsWith("/standings"),
  ).length;

  // When
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findByText("Aucun match pour cette sélection");
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await user.press(
    screen.getByRole("tab", { name: `Classement ${pool.pool.name}` }),
  );

  // Then
  expect(await screen.findByText("Official Z")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/standings"),
    ),
  ).toHaveLength(initial);
});

it("keeps a pool calendar usable while standings fail", async () => {
  // Given
  failed = true;
  const user = userEvent.setup();
  await open(<PoolScreen poolId={pool.pool.id} />);

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
  await screen.findByText("Official Z");
  const reads = mockFetch.mock.calls.length;

  // When
  await user.press(screen.getByRole("radio", { name: "Afficher en cartes" }));

  // Then
  expect(
    screen.getByRole("radio", { name: "Afficher en cartes", checked: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Official Z.*Ratio : ∞/ }),
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

  // When
  await user.press(
    await screen.findByRole("radio", { name: "Afficher en cartes" }),
  );

  // Then
  expect(
    screen
      .getAllByRole("link")
      .map((node) => node.props.accessibilityLabel.split(".")[0]),
  ).toEqual(["Second", "Official A", "Third", "Official Z"]);
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

  // When
  await user.press(
    await screen.findByRole("radio", { name: "Afficher en cartes" }),
  );

  // Then
  expect(
    screen
      .getAllByRole("link")
      .map((node) => node.props.accessibilityLabel.split(".")[0]),
  ).toEqual(["Official Z", "Official A"]);
  expect(screen.getByText("Also first")).toBeOnTheScreen();
  expect(screen.getByText("Second")).toBeOnTheScreen();
  expect(screen.getByText("Third")).toBeOnTheScreen();
});

it("retries an initial failure without announcing a successful empty table", async () => {
  // Given
  failed = true;
  const user = userEvent.setup();
  await open(panel());
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
    // Query can finish before React commits its notified read state; wait for the actual recovery control.
    if (availability === "unavailable")
      await screen.findByRole("button", { name: "Réessayer" });
    else await screen.findByLabelText("Actualiser les données");
    failed = true;
    mockFetch.mockClear();

    // When
    if (availability === "unavailable") {
      expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
      await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
    } else
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );

    // Then
    expect(
      await screen.findByRole("alert", {
        name:
          availability === "unavailable"
            ? TECHNICAL_ERROR_TITLE
            : TECHNICAL_ERROR,
      }),
    ).toBeOnTheScreen();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    if (availability === "unavailable") {
      await screen.findByRole("button", { name: "Réessayer", busy: false });
      expect(screen.queryByRole("alert", { name: TECHNICAL_ERROR })).toBeNull();
    }
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

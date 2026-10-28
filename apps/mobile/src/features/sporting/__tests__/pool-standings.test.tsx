import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
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
let client = createQueryClient();
let table: PoolStandingsResponse;
let failed = false;

beforeEach(() => {
  client = createQueryClient();
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
  client.clear();
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
          <QueryClientProvider client={client}>
            <ThemeProvider>
              <ActionFeedbackProvider scopeKey="standings-test">
                <ApplicationAccessProvider>
                  <AccountSessionProvider>{children}</AccountSessionProvider>
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
  ["available", "Aucune ligne publiée"],
  ["not-published", "Classement non publié"],
  ["unavailable", "Classement indisponible pour le moment"],
] as const)(
  "distinguishes %s from other empty states",
  async (availability, message) => {
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
    expect(await screen.findByText(message)).toBeOnTheScreen();
  },
);

it("retains source freshness after a failed explicit refresh", async () => {
  // Given
  await open(panel());
  const observation = await screen.findByText(/Observé le/);
  failed = true;

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(screen.getByText("Official Z")).toBeOnTheScreen();
  expect(observation).toBeOnTheScreen();
  expect(
    await screen.findByText(/Dernière actualisation impossible/),
  ).toBeOnTheScreen();
});

it("exposes a failed acquisition independently of the usable table", async () => {
  // Given
  table.lastAttemptFailed = true;

  // When
  await open(panel());

  // Then
  expect(
    await screen.findByText(/Dernière acquisition échouée/),
  ).toBeOnTheScreen();
  expect(screen.getByText("Official Z")).toBeOnTheScreen();
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
  await layoutNativeTabs();
  await screen.findByText("Aucun match pour cette sélection");
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await user.press(
    screen.getByRole("tab", { name: `Classement ${pool.pool.name}` }),
  );
  await layoutNativeTabs();

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
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await layoutNativeTabs();

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

it("switches to the exact official columns without another read", async () => {
  // Given
  const user = userEvent.setup();
  await open(panel());
  await screen.findByText("Official Z");
  const reads = mockFetch.mock.calls.length;

  // When
  await user.press(screen.getByRole("radio", { name: "Afficher en colonnes" }));

  // Then
  expect(
    screen.getByRole("radio", { name: "Afficher en colonnes", checked: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Ratio : ∞")).toBeOnTheScreen();
  expect(screen.getByLabelText("Pts : non renseigné")).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(reads);
});

it("retries an initial failure without announcing a successful empty table", async () => {
  // Given
  failed = true;
  const user = userEvent.setup();
  await open(panel());
  expect(screen.queryByText("Aucune ligne publiée")).toBeNull();
  failed = false;

  // When
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Official Z")).toBeOnTheScreen();
});

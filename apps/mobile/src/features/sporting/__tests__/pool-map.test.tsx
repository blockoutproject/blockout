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
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type {
  MunicipalityLocationResponse,
  PoolParticipantResponse,
  PoolParticipantsResponse,
  PoolStandingsResponse,
} from "../../../../.generated/schemas/index.zod";
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
import { PoolMap } from "../components/pool-map";
import { nativeMapCommands } from "../test-support/native-maps";
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
const secondTeamId = "00000000-0000-4000-8000-000000002152";
const thirdTeamId = "00000000-0000-4000-8000-000000002153";
const professionalId = "00000000-0000-4000-8000-000000002154";
let client: QueryClient;
let publicClient = createQueryClient();
let participants: PoolParticipantsResponse;
let table: PoolStandingsResponse;
let participantsFailure: number | undefined;
let standingsFailure: number | undefined;

/** Retrieves the real private lifetime client; failure scenarios explicitly disable read retries. */
function PrivateQueries({ children }: QueryFixtureProps) {
  const current = useQueryClient();
  // Configure this fresh real client before descendant consultation observers start their first request.
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
  for (const command of Object.values(nativeMapCommands)) command.mockClear();
  participantsFailure = undefined;
  standingsFailure = undefined;
  participants = { poolId: pool.pool.id, items: [] };
  table = {
    poolId: pool.pool.id,
    availability: "not-published",
    lastAttemptFailed: false,
    columns: [],
    rows: [],
  };
  mockFetch.mockReset().mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/application-access")
      return Promise.resolve(Response.json(applicationAccessResponse()));
    if (parsed.pathname.endsWith("/participants"))
      return Promise.resolve(
        participantsFailure
          ? Response.json({}, { status: participantsFailure })
          : Response.json(participants),
      );
    if (parsed.pathname.endsWith("/standings"))
      return Promise.resolve(
        standingsFailure
          ? Response.json({}, { status: standingsFailure })
          : Response.json(table),
      );
    if (parsed.pathname === `/pools/${pool.pool.id}`)
      return Promise.resolve(Response.json({ pool }));
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

/** Supplies the required current-team context; each scenario owns identity, geography and professional status. */
function participant(
  id: string,
  name: string,
  location?: MunicipalityLocationResponse,
  professional = false,
): PoolParticipantResponse {
  return {
    team: {
      team: { id, name },
      season: pool.season,
      classification: {},
      professional,
      ...(professional ? {} : { club: { id, name: `Club ${name}` } }),
    },
    ...(location ? { location } : {}),
  };
}

/** Supplies a published official row; each scenario owns literal columns and raw statistics. */
function publishedTable(
  statistics: Record<string, string>,
  columns = ["Jou.", "Gag.", "Per."],
): PoolStandingsResponse {
  return {
    poolId: pool.pool.id,
    availability: "available",
    observedAt: "2026-10-20T12:00:00Z",
    lastAttemptFailed: false,
    columns,
    rows: [
      {
        sourceName: "Rives",
        team: { id: sportingId, name: "Rives" },
        statistics,
      },
    ],
  };
}

/** Real cache, generated decoder, session, admission, theme and advertising; only HTTP and native I/O are controlled. */
async function open(content = panel(), settleReads = true) {
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
              <ActionFeedbackProvider scopeKey="map-test">
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
  if (settleReads) {
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await waitFor(() => expect(client.isFetching()).toBe(0));
  }
  return result;
}

/** Supplies the existing native tab owner without replacing the component's read lifecycle. */
function panel(active = true) {
  return (
    <PagedTabs
      selected="map"
      onSelect={() => undefined}
      tabs={[
        {
          id: "map",
          label: "Carte",
          content: <PoolMap pool={pool} active={active} />,
        },
      ]}
    />
  );
}

it("opens independent participants lazily when the pool standings are unavailable", async () => {
  // Given
  standingsFailure = 503;
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 46.16,
      longitude: -1.15,
      label: "La Rochelle",
    }),
    participant(secondTeamId, "Marais", {
      latitude: 46.32,
      longitude: -0.46,
      label: "Niort",
    }),
    participant(thirdTeamId, "Localité invalidée"),
    participant(professionalId, "Professionnelle sans club", undefined, true),
  ];
  const user = userEvent.setup();
  await open(<PoolScreen poolId={pool.pool.id} />);
  await screen.findByRole("alert", { name: TECHNICAL_ERROR_TITLE });
  expect(
    mockFetch.mock.calls.some(([url]) =>
      new URL(url).pathname.endsWith("/participants"),
    ),
  ).toBe(false);

  // When
  await user.press(screen.getByRole("tab", { name: "Carte" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "La Rochelle: Rives" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("4 équipes, dont 2 localisées")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Niort: Marais" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", {
      name: /Localité invalidée|Professionnelle sans club/,
    }),
  ).toBeNull();
  expect(
    screen.queryByText("Localisation à la commune, pas au gymnase."),
  ).toBeNull();
});

it("keeps each exact coincident team selectable without merging a nearby point or requiring a logo", async () => {
  // Given
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 46.160001,
      longitude: -1.150001,
      label: "Commune A",
    }),
    participant(secondTeamId, "Marais", {
      latitude: 46.160001,
      longitude: -1.150001,
      label: "Commune B",
    }),
    participant(thirdTeamId, "Voisine", {
      latitude: 46.160002,
      longitude: -1.150001,
      label: "Commune C",
    }),
  ];
  const user = userEvent.setup();
  await open();
  const shared = await screen.findByRole("button", {
    name: "Commune A · Commune B: Rives, Marais",
  });

  // When
  // MarkerPress is a native map event, outside userEvent's Pressable interaction contract.
  await fireEvent(shared, "press", { stopPropagation: jest.fn() });
  await user.press(screen.getByRole("radio", { name: "Marais" }));
  await user.press(screen.getByRole("link", { name: "Marais" }));
  await user.press(screen.getByRole("radio", { name: "Rives" }));
  await user.press(screen.getByRole("link", { name: "Rives" }));

  // Then
  expect(shared.props.coordinate).toEqual({
    latitude: 46.160001,
    longitude: -1.150001,
  });
  expect(
    screen.getByRole("button", { name: "Commune C: Voisine" }).props.coordinate,
  ).toEqual({
    latitude: 46.160002,
    longitude: -1.150001,
  });
  expect(
    screen.getByRole("radio", { name: "Marais", checked: false }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("radio", { name: "Rives", checked: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getAllByRole("image", { name: "Logo absent : Marais" }).length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText("Marais")).toBeNull();
  expect(mockPush).toHaveBeenNthCalledWith(1, {
    pathname: "/teams/[teamId]",
    params: { teamId: secondTeamId },
  });
  expect(mockPush).toHaveBeenNthCalledWith(2, {
    pathname: "/teams/[teamId]",
    params: { teamId: sportingId },
  });
});

it("distinguishes no usable locations from no participating teams", async () => {
  // Given
  participants.items = [
    participant(sportingId, "Localité absente"),
    participant(professionalId, "Professionnelle sans club", undefined, true),
  ];

  // When
  await open();

  // Then
  expect(
    await screen.findByText("Aucune localisation disponible"),
  ).toBeOnTheScreen();
  expect(screen.queryByText("2 équipes")).toBeNull();
  expect(
    screen
      .queryAllByRole("button")
      .filter((node) => node.props.coordinate !== undefined),
  ).toHaveLength(0);
  expect(screen.queryByText(/Aucune équipe/)).toBeNull();
});

it("matches optional standings by exact team UUID without borrowing a source-name match", async () => {
  // Given: participants own identity/location; only the exact resolved official row owns its record.
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 0,
      longitude: 0,
      label: "Commune publiée",
    }),
  ];
  table = {
    poolId: pool.pool.id,
    availability: "available",
    observedAt: "2026-10-20T12:00:00Z",
    lastAttemptFailed: false,
    columns: ["Jou.", "Gag.", "Per.", "Pts"],
    rows: [
      {
        sourceName: "Rives",
        statistics: { "Jou.": "99", "Gag.": "99", "Per.": "0", Pts: "999" },
      },
      {
        sourceName: "Rives",
        team: { id: secondTeamId, name: "Rives" },
        statistics: { "Jou.": "8", "Gag.": "1", "Per.": "7" },
      },
      {
        sourceName: "Official Rives",
        team: { id: sportingId, name: "Published name" },
        position: 7,
        statistics: { "Jou.": "8", "Gag.": "7", "Per.": "1", Pts: "999" },
      },
    ],
  };
  await open();

  // When
  await fireEvent(
    await screen.findByRole("button", { name: "Commune publiée: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );

  // Then
  expect(await screen.findByLabelText("Joués : 8")).toBeOnTheScreen();
  expect(screen.getByLabelText("Gagnés : 7")).toBeOnTheScreen();
  expect(screen.getByLabelText("Perdus : 1")).toBeOnTheScreen();
  expect(screen.getByText("Rives")).toBeOnTheScreen();
  expect(screen.queryByText(pool.pool.name)).toBeNull();
  expect(screen.getByRole("link", { name: "Rives" })).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: "Voir l’équipe" })).toBeNull();
  expect(screen.queryByText("Pts")).toBeNull();
  expect(screen.queryByText("999")).toBeNull();
  expect(screen.queryByText("Official Rives")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Commune publiée: Rives" }).props
      .coordinate,
  ).toEqual({ latitude: 0, longitude: 0 });
});

it("opens participant identity and navigation while the optional standings response is still pending", async () => {
  // Given: only the optional HTTP response is held; providers and both Query observers remain real.
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 0,
      longitude: 0,
      label: "Test city",
    }),
  ];
  let resolveStandings!: (response: Response) => void;
  const pendingStandings = new Promise<Response>((resolve) => {
    resolveStandings = resolve;
  });
  const ordinaryFetch = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/standings")
      ? pendingStandings
      : ordinaryFetch(url),
  );
  const user = userEvent.setup();
  await open(panel(), false);

  // When
  await fireEvent(
    await screen.findByRole("button", { name: "Test city: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await user.press(screen.getByRole("link", { name: "Rives" }));

  // Then
  expect(screen.getByText("Rives")).toBeOnTheScreen();
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/teams/[teamId]",
    params: { teamId: sportingId },
  });
  expect(screen.queryByLabelText(/^Joués :/)).toBeNull();
  await act(async () => resolveStandings(Response.json(table)));
  await waitFor(() => expect(client.isFetching()).toBe(0));
});

it.each(["initial failure", "not published", "unmatched row"] as const)(
  "keeps markers and the exact team action available with optional standings %s",
  async (state) => {
    // Given
    participants.items = [
      participant(sportingId, "Rives", {
        latitude: 0,
        longitude: 0,
        label: "Test city",
      }),
    ];
    if (state === "initial failure") standingsFailure = 503;
    if (state === "unmatched row") {
      table = publishedTable({ "Jou.": "8", "Gag.": "7", "Per.": "1" });
      table.rows[0].team = { id: secondTeamId, name: "Rives" };
    }
    const user = userEvent.setup();
    await open();

    // When
    await fireEvent(
      await screen.findByRole("button", { name: "Test city: Rives" }),
      "press",
      { stopPropagation: jest.fn() },
    );
    await user.press(screen.getByRole("link", { name: "Rives" }));

    // Then
    expect(screen.getByText("Rives")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Joués :/)).toBeNull();
    expect(screen.queryByLabelText(/^Gagnés :/)).toBeNull();
    expect(screen.queryByLabelText(/^Perdus :/)).toBeNull();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/teams/[teamId]",
      params: { teamId: sportingId },
    });
  },
);

it("preserves published partial LNV match values without substituting set counts or zero losses", async () => {
  // Given
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 0,
      longitude: 0,
      label: "Test city",
    }),
  ];
  table = publishedTable(
    {
      "Matchs / Joués": "0",
      "Matchs / Gagnés": "  F  ",
      "Matchs / Perdus": "  ",
      "Sets / Gagnés": "12",
      "Sets / Perdus": "4",
    },
    [
      "Matchs / Joués",
      "Matchs / Gagnés",
      "Matchs / Perdus",
      "Sets / Gagnés",
      "Sets / Perdus",
    ],
  );
  await open();

  // When
  await fireEvent(
    await screen.findByRole("button", { name: "Test city: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );

  // Then
  expect(await screen.findByLabelText("Joués : 0")).toBeOnTheScreen();
  expect(screen.getByLabelText("Gagnés :   F  ")).toBeOnTheScreen();
  expect(screen.getByLabelText("Perdus : indisponible")).toBeOnTheScreen();
  expect(screen.queryByText("12")).toBeNull();
  expect(screen.queryByText("4")).toBeNull();
  expect(screen.getByRole("link", { name: "Rives" })).toBeOnTheScreen();
});

it("closes the selected summary without changing participants or needing a tile-ready event", async () => {
  // Given
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 46.16,
      longitude: -1.15,
      label: "La Rochelle",
    }),
  ];
  standingsFailure = 503;
  const user = userEvent.setup();
  await open();
  await fireEvent(
    await screen.findByRole("button", { name: "La Rochelle: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await screen.findByRole("link", { name: "Rives" });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(
    screen.getByRole("radio", { name: "Rives", checked: true }),
  ).toBeOnTheScreen();
  const reads = mockFetch.mock.calls.length;

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(screen.queryByRole("link", { name: "Rives" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "La Rochelle: Rives" }),
  ).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(reads);
});

it("keeps local selection changes independent of standings reads", async () => {
  // Given
  const location = { latitude: 46.16, longitude: -1.15, label: "La Rochelle" };
  participants.items = [
    participant(sportingId, "Rives", location),
    participant(secondTeamId, "Marais", location),
  ];
  standingsFailure = 503;
  const user = userEvent.setup();
  await open();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/standings"),
    ),
  ).toHaveLength(1);
  mockFetch.mockClear();

  // When
  await fireEvent(
    await screen.findByRole("button", { name: "La Rochelle: Rives, Marais" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await user.press(screen.getByRole("radio", { name: "Marais" }));
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await fireEvent(
    screen.getByRole("button", { name: "La Rochelle: Rives, Marais" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "Rives" })).toBeOnTheScreen();
});

it("retains an admitted map selection when returning from standings without rereading either resource", async () => {
  // Given: actual shared scenes admit standings first, then independent participants.
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 46.16,
      longitude: -1.15,
      label: "La Rochelle",
    }),
  ];
  const user = userEvent.setup();
  await open(<PoolScreen poolId={pool.pool.id} />);
  await user.press(screen.getByRole("tab", { name: "Carte" }));
  await fireEvent(
    await screen.findByRole("button", { name: "La Rochelle: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await screen.findByRole("link", { name: "Rives" });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  const admittedReads = mockFetch.mock.calls.length;

  // When: the same mounted map is covered by another retained scene and selected again.
  await user.press(screen.getByRole("tab", { name: "Classement" }));
  expect(screen.queryByRole("link", { name: "Rives" })).toBeNull();
  await user.press(screen.getByRole("tab", { name: "Carte" }));

  // Then: selection and exact action survive; the native camera/offset still need device evidence.
  expect(
    screen.getByRole("radio", { name: "Rives", checked: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Rives" })).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(admittedReads);
});

it("refreshes both resources and drops a selected invalidated locality", async () => {
  // Given
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 46.16,
      longitude: -1.15,
      label: "La Rochelle",
    }),
    participant(secondTeamId, "Marais", {
      latitude: 46.32,
      longitude: -0.46,
      label: "Niort",
    }),
  ];
  await open();
  await fireEvent(
    await screen.findByRole("button", { name: "La Rochelle: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await screen.findByRole("link", { name: "Rives" });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  participants.items = [
    participant(sportingId, "Rives"),
    participants.items[1],
  ];
  mockFetch.mockClear();

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "La Rochelle: Rives" }),
    ).toBeNull(),
  );
  expect(
    screen.getByRole("button", { name: "Niort: Marais" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: "Rives" })).toBeNull();

  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(
    mockFetch.mock.calls.map(([url]) => new URL(url).pathname).sort(),
  ).toEqual([
    `/pools/${pool.pool.id}/participants`,
    `/pools/${pool.pool.id}/standings`,
  ]);
});

it("retains authorized markers, selection and published record after technical refresh failures", async () => {
  // Given
  table = publishedTable({ "Jou.": "8", "Gag.": "7", "Per.": "1" });
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 46.16,
      longitude: -1.15,
      label: "La Rochelle",
    }),
  ];
  await open();
  await fireEvent(
    await screen.findByRole("button", { name: "La Rochelle: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await screen.findByRole("link", { name: "Rives" });
  expect(await screen.findByLabelText("Joués : 8")).toBeOnTheScreen();
  participantsFailure = 503;
  standingsFailure = 503;

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "La Rochelle: Rives" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Rives" })).toBeOnTheScreen();
  expect(screen.queryByText("Aucune localisation disponible")).toBeNull();
  expect(screen.getByLabelText("Joués : 8")).toBeOnTheScreen();
  expect(screen.getByLabelText("Gagnés : 7")).toBeOnTheScreen();
  expect(screen.getByLabelText("Perdus : 1")).toBeOnTheScreen();
});

it.each([401, 403, 404])(
  "withdraws a refused optional record (%i) without hiding participants or reviving it on later 503",
  async (status) => {
    // Given
    participants.items = [
      participant(sportingId, "Rives", {
        latitude: 0,
        longitude: 0,
        label: "Test city",
      }),
    ];
    table = publishedTable({ "Jou.": "8", "Gag.": "7", "Per.": "1" });
    await open();
    await fireEvent(
      await screen.findByRole("button", { name: "Test city: Rives" }),
      "press",
      { stopPropagation: jest.fn() },
    );
    await screen.findByLabelText("Joués : 8");
    standingsFailure = status;

    // When
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await waitFor(() => {
      expect(client.isFetching()).toBe(0);
      expect(screen.queryByLabelText(/^Joués :/)).toBeNull();
    });
    standingsFailure = 503;
    mockFetch.mockClear();
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/standings"),
      ),
    ).toHaveLength(1);
    expect(screen.queryByLabelText(/^Joués :/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Test city: Rives" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Rives" })).toBeOnTheScreen();
  },
);

it.each([401, 403, 404])(
  "withdraws refused participants (%i) and never revives their markers or action after later 503",
  async (status) => {
    // Given
    participants.items = [
      participant(sportingId, "Rives", {
        latitude: 0,
        longitude: 0,
        label: "Test city",
      }),
    ];
    table = publishedTable({ "Jou.": "8", "Gag.": "7", "Per.": "1" });
    const user = userEvent.setup();
    await open();
    await fireEvent(
      await screen.findByRole("button", { name: "Test city: Rives" }),
      "press",
      { stopPropagation: jest.fn() },
    );
    await screen.findByLabelText("Joués : 8");
    participantsFailure = status;

    // When
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await screen.findByRole("button", { name: "Réessayer", busy: false });
    participantsFailure = 503;
    mockFetch.mockClear();
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/participants"),
      ),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Test city: Rives" }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Rives" })).toBeNull();
    expect(screen.queryByLabelText(/^Joués :/)).toBeNull();
    expect(screen.queryByText("Aucune localisation disponible")).toBeNull();
  },
);

it("retries an initial participant failure without announcing empty geography", async () => {
  // Given
  participantsFailure = 503;
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 46.16,
      longitude: -1.15,
      label: "La Rochelle",
    }),
  ];
  const user = userEvent.setup();
  await open();
  await screen.findByRole("button", { name: "Réessayer" });
  expect(screen.queryByText("Aucune localisation disponible")).toBeNull();
  participantsFailure = undefined;
  mockFetch.mockClear();

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "La Rochelle: Rives" }),
  ).toBeOnTheScreen();
  expect(mockFetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    `/pools/${pool.pool.id}/participants`,
  ]);
});

it.each([
  ["ready-first", 1],
  ["layout-first", 1],
  ["ready-first", 2],
  ["layout-first", 2],
] as const)(
  "waits for both native readiness and nonzero layout (%s, %i points)",
  async (order, count) => {
    // Given
    participants.items = [
      participant(sportingId, "Rives", {
        latitude: 46.16,
        longitude: -1.15,
        label: "La Rochelle",
      }),
      ...(count === 2
        ? [
            participant(secondTeamId, "Marais", {
              latitude: 46.32,
              longitude: -0.46,
              label: "Niort",
            }),
          ]
        : []),
    ];
    const user = userEvent.setup();
    await open();
    // The controlled native boundary has no semantic action for its lifecycle callbacks.
    const nativeMap = await screen.findByTestId("native-map-boundary");
    const frame = nativeMapCommands.fitToCoordinates;
    await fireEvent(nativeMap, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 0 } },
    });
    await user.press(
      screen.getByRole("button", { name: "Afficher toutes les équipes" }),
    );
    expect(frame).not.toHaveBeenCalled();
    if (order === "ready-first") await fireEvent(nativeMap, "mapReady");
    else
      await fireEvent(nativeMap, "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: 370, height: 422 } },
      });
    await user.press(
      screen.getByRole("button", { name: "Afficher toutes les équipes" }),
    );
    expect(frame).not.toHaveBeenCalled();

    // When
    if (order === "ready-first")
      await fireEvent(nativeMap, "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: 370, height: 422 } },
      });
    else await fireEvent(nativeMap, "mapReady");

    // Then
    expect(frame).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Afficher toutes les équipes" }),
    ).toBeEnabled();
  },
);

it("keeps the lone municipal frame until Show all explicitly clears and reframes selection", async () => {
  // Given
  const location = { latitude: 0, longitude: 0, label: "Test city" };
  participants.items = [
    participant(sportingId, "Rives", location),
    participant(secondTeamId, "Marais", location),
  ];
  const user = userEvent.setup();
  await open();
  const nativeMap = await screen.findByTestId("native-map-boundary");
  await fireEvent(nativeMap, "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 370, height: 440 } },
  });
  await fireEvent(nativeMap, "mapReady");
  expect(nativeMapCommands.fitToCoordinates).toHaveBeenCalledTimes(1);
  expect(nativeMapCommands.fitToCoordinates.mock.calls[0][0]).toEqual([
    { latitude: 0.075, longitude: 0.075 },
    { latitude: -0.075, longitude: -0.075 },
  ]);
  nativeMapCommands.fitToCoordinates.mockClear();

  // When: selection, dismissal and refreshed names/coordinates leave the camera where the user left it.
  await fireEvent(
    screen.getByRole("button", { name: "Test city: Rives, Marais" }),
    "press",
    {
      stopPropagation: jest.fn(),
    },
  );
  await user.press(screen.getByRole("radio", { name: "Marais" }));
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await fireEvent(
    screen.getByRole("button", { name: "Test city: Rives, Marais" }),
    "press",
    {
      stopPropagation: jest.fn(),
    },
  );
  const updatedLocation = { latitude: 1, longitude: 2, label: "Test city" };
  participants.items = [
    participant(
      sportingId,
      "Rives with a much longer published name",
      updatedLocation,
    ),
    participant(secondTeamId, "Marais", updatedLocation),
  ];
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByText("Rives with a much longer published name");
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then: municipal markers remain exact; only an explicit Show all requests another native frame.
  expect(nativeMapCommands.fitToCoordinates).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", {
      name: "Test city: Rives with a much longer published name, Marais",
    }).props.coordinate,
  ).toEqual({ latitude: 1, longitude: 2 });
  await user.press(
    screen.getByRole("button", { name: "Afficher toutes les équipes" }),
  );
  expect(
    screen.queryByRole("link", {
      name: "Rives with a much longer published name",
    }),
  ).toBeNull();
  expect(nativeMapCommands.fitToCoordinates).toHaveBeenCalledTimes(1);
  expect(nativeMapCommands.fitToCoordinates.mock.calls[0][0]).toEqual([
    { latitude: 1.075, longitude: 2.075 },
    { latitude: 0.925, longitude: 1.925 },
  ]);
});

it("ignores an already pending zoom and team action after the map becomes inactive", async () => {
  // Given
  participants.items = [
    participant(sportingId, "Rives", {
      latitude: 0,
      longitude: 0,
      label: "Test city",
    }),
  ];
  let resolveCamera!: (camera: { altitude: number; zoom: number }) => void;
  nativeMapCommands.getCamera.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveCamera = resolve;
      }),
  );
  const user = userEvent.setup();
  const rendered = await open();
  const nativeMap = await screen.findByTestId("native-map-boundary");
  await fireEvent(nativeMap, "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 370, height: 440 } },
  });
  await fireEvent(nativeMap, "mapReady");
  await fireEvent(
    screen.getByRole("button", { name: "Test city: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await user.press(screen.getByRole("button", { name: "Zoomer" }));
  expect(nativeMapCommands.getCamera).toHaveBeenCalledTimes(1);

  // When
  await rendered.rerender(panel(false));
  await user.press(screen.getByRole("link", { name: "Rives" }));
  await act(async () => resolveCamera({ altitude: 10000, zoom: 8 }));

  // Then
  expect(nativeMapCommands.animateCamera).not.toHaveBeenCalled();
  expect(nativeMapCommands.setCamera).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

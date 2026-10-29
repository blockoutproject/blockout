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
let client = createQueryClient();
let participants: PoolParticipantsResponse;
let table: PoolStandingsResponse;
let participantsFailure = false;
let standingsFailure = false;

beforeEach(() => {
  client = createQueryClient();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  mockPush.mockReset();
  participantsFailure = false;
  standingsFailure = false;
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
          ? Response.json({}, { status: 503 })
          : Response.json(participants),
      );
    if (parsed.pathname.endsWith("/standings"))
      return Promise.resolve(
        standingsFailure
          ? Response.json({}, { status: 503 })
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
  client.clear();
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

/** Real cache, generated decoder, session, admission, theme and advertising; only HTTP and native I/O are controlled. */
async function open(content = panel()) {
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
              <ActionFeedbackProvider scopeKey="map-test">
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
  return result;
}

/** Supplies the existing native tab owner without replacing the component's read lifecycle. */
function panel() {
  return (
    <PagedTabs
      selected="map"
      onSelect={() => undefined}
      tabs={[{ id: "map", label: "Carte", content: <PoolMap pool={pool} /> }]}
    />
  );
}

it("opens independent participants lazily when the pool standings are unavailable", async () => {
  // Given
  standingsFailure = true;
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
  await layoutNativeTabs();

  // Then
  expect(
    await screen.findByText("4 équipes, dont 2 localisées"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "La Rochelle: Rives" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Niort: Marais" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", {
      name: /Localité invalidée|Professionnelle sans club/,
    }),
  ).toBeNull();
  expect(
    screen.getByText("Localisation à la commune, pas au gymnase."),
  ).toBeOnTheScreen();
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
  await user.press(screen.getByRole("link", { name: "Voir l’équipe" }));
  await user.press(screen.getByRole("radio", { name: "Rives" }));
  await user.press(screen.getByRole("link", { name: "Voir l’équipe" }));

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
  expect(screen.getByText("2 équipes")).toBeOnTheScreen();
  expect(
    screen
      .queryAllByRole("button")
      .filter((node) => node.props.coordinate !== undefined),
  ).toHaveLength(0);
  expect(screen.queryByText(/Aucune équipe/)).toBeNull();
});

it("does not create markers from unmatched standings and preserves exact selected statistics", async () => {
  // Given
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
    columns: ["Ratio", "Pts"],
    rows: [
      { sourceName: "Unmatched", statistics: { Ratio: "99", Pts: "999" } },
      {
        sourceName: "Official Rives",
        team: { id: sportingId, name: "Rives" },
        position: 7,
        statistics: { Ratio: "∞", Pts: "0" },
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
  expect(await screen.findByText("∞")).toBeOnTheScreen();
  expect(screen.getByText("0")).toBeOnTheScreen();
  expect(screen.getByText("7")).toBeOnTheScreen();
  expect(screen.queryByText("Unmatched")).toBeNull();
  expect(screen.queryByText("999")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Commune publiée: Rives" }).props
      .coordinate,
  ).toEqual({ latitude: 0, longitude: 0 });
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
  standingsFailure = true;
  const user = userEvent.setup();
  await open();
  await fireEvent(
    await screen.findByRole("button", { name: "La Rochelle: Rives" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  await screen.findByRole("link", { name: "Voir l’équipe" });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  const reads = mockFetch.mock.calls.length;

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(screen.queryByRole("link", { name: "Voir l’équipe" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "La Rochelle: Rives" }),
  ).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(reads);
});

it("drops a selected invalidated locality after refreshing only participants", async () => {
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
  await screen.findByRole("link", { name: "Voir l’équipe" });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  participants.items = [
    participant(sportingId, "Rives"),
    participants.items[1],
  ];
  mockFetch.mockClear();

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByText("2 équipes, dont 1 localisée"),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "La Rochelle: Rives" }),
  ).toBeNull();
  expect(screen.queryByRole("link", { name: "Voir l’équipe" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Niort: Marais" }),
  ).toBeOnTheScreen();
  expect(mockFetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    `/pools/${pool.pool.id}/participants`,
  ]);
});

it("retains authorized markers and selection after an ordinary refresh failure", async () => {
  // Given
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
  await screen.findByRole("link", { name: "Voir l’équipe" });
  participantsFailure = true;

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "La Rochelle: Rives" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Voir l’équipe" })).toBeOnTheScreen();
  expect(screen.queryByText("Aucune localisation disponible")).toBeNull();
});

it("retries an initial participant failure without announcing empty geography", async () => {
  // Given
  participantsFailure = true;
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
  participantsFailure = false;
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

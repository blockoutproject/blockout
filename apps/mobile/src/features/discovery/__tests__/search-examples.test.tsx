import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import "../../../shared/native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native";
import { router, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { useConsultationQueries } from "../../sporting/match-consultation";
import { useQuery, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import SearchLayout from "../../../app/(ordinary)/(tabs)/search/_layout";
import { SearchScreen } from "../screens/search-screen";
import ClubRoute from "../../../app/(ordinary)/clubs/[clubId]";
import { SearchFilters } from "../components/search-filters";
import { SearchFilterChoice } from "../components/search-filter-choice";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";

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
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const environment = { ...process.env };
const firstId = "aaaaaaaa-0000-4000-8000-000000000001";
const secondId = "bbbbbbbb-0000-4000-8000-000000000002";
const season = { id: firstId, label: "2026/2027", startYear: 2026 };
let client: QueryClient;
let publicClient = createQueryClient();

/** Controls HTTP only; the generated client, Query, navigation and feature owners stay real. */
function publicReads(url: string): Promise<Response> {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith("/application-access"))
    return Promise.resolve(Response.json(applicationAccessResponse()));
  if (parsed.pathname.endsWith("/sporting-search-options"))
    return Promise.resolve(
      Response.json({
        resourceType: parsed.searchParams.get("resourceType"),
        seasons: [season],
        divisions: [],
        formats: ["6x6"],
        genders: ["female"],
      }),
    );
  if (parsed.pathname.endsWith("/clubs"))
    return Promise.resolve(
      Response.json({
        clubs: [
          { club: { id: firstId, name: "Volley" }, city: "Lyon" },
          { club: { id: secondId, name: "Volley" }, city: "Niort" },
        ],
      }),
    );
  if (parsed.pathname.endsWith(`/clubs/${secondId}`))
    return Promise.resolve(
      Response.json({
        club: { id: secondId, name: "Volley Niort" },
        contacts: {},
        seasons: [],
      }),
    );
  if (parsed.pathname.endsWith("/teams"))
    return Promise.resolve(
      Response.json({
        teams: [
          {
            team: { id: firstId, name: "Volley" },
            club: { id: secondId, name: "Club public" },
            season,
            classification: { format: "6x6", gender: "female" },
            professional: false,
          },
        ],
      }),
    );
  if (parsed.pathname.endsWith("/pools"))
    return Promise.resolve(
      Response.json({
        pools: [
          {
            pool: { id: firstId, name: "Poule A" },
            season,
            classification: {},
            competitionName: "Ligue publique",
            phaseName: "Finale",
          },
        ],
      }),
    );
  throw new Error(`Unexpected controlled path ${parsed.pathname}`);
}
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
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("synthetic-user"));
  mockFetch.mockReset().mockImplementation(publicReads);
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Keeps the actual visit across native filter/detail routes; layout and transport alone are controlled. */
async function renderSearch(proAccent = false) {
  await renderRouter(
    {
      _layout: () => (
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      ),
      "search/_layout": SearchLayout,
      "search/index": SearchScreen,
      "search/(sheets)/filters": SearchFilters,
      "search/(sheets)/choice": SearchFilterChoice,
      "clubs/[clubId]": ClubRoute,
      home: () => <Text>Accueil de test</Text>,
      "pool-refusal": PoolChildRead,
    },
    {
      initialUrl: "/search",
      wrapper: ({ children }) => (
        <GestureHandlerRootView>
          <SafeAreaProvider
            initialMetrics={{
              frame: { x: 0, y: 0, width: 390, height: 844 },
              insets: { top: 0, right: 0, bottom: 0, left: 0 },
            }}
          >
            <QueryClientProvider client={publicClient}>
              <ThemeProvider proAccent={proAccent}>
                <ApplicationAccessProvider>
                  <AccountSessionProvider>
                    <PrivateQueries>
                      <AccountFeedbackProvider>
                        <AdvertisingProviders>{children}</AdvertisingProviders>
                      </AccountFeedbackProvider>
                    </PrivateQueries>
                  </AccountSessionProvider>
                </ApplicationAccessProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      ),
    },
  );
}

/** Executes the real F03 child read while retaining its ordinary parent cache identity. */
function PoolChildRead() {
  const queries = useConsultationQueries();
  useQuery({ ...queries.pool(firstId), enabled: false });
  const child = useQuery(queries.standings(firstId));
  return (
    <Text>
      {child.isError ? "Poule indisponible" : "Lecture du classement"}
    </Text>
  );
}

/** Counts collection requests without conflating options, media or admission reads. */
function collectionCalls(collection: string) {
  return mockFetch.mock.calls.filter(([url]) =>
    new URL(url).pathname.endsWith("/" + collection),
  );
}

it.each(["guest", "free", "Pro", "unknown"])(
  "opens examples in every public tab for %s",
  async (access) => {
    // Given: pending restoration must not block public discovery.
    const pending = Promise.withResolvers<boolean>();
    if (access === "unknown")
      mockAuth0.hasValidCredentials.mockReturnValue(pending.promise);
    else mockAuth0.hasValidCredentials.mockResolvedValue(access !== "guest");
    const user = userEvent.setup();
    try {
      await renderSearch(access === "Pro");
      await screen.findByText("Club public");

      // When
      await user.press(screen.getByRole("tab", { name: "Clubs" }));
      await screen.findByText("Niort");
      await user.press(screen.getByRole("tab", { name: "Poules" }));
      await screen.findByText("Poule A");

      // Then
      expect(
        screen.getByRole("header", { name: "Exemples" }),
      ).toBeOnTheScreen();
      expect(screen.getAllByLabelText("Exemples")).toHaveLength(2);
      expect(
        screen.queryByText(/résultats chargés|total|Fin des résultats/),
      ).not.toBeOnTheScreen();
      expect(
        collectionCalls("teams")
          .concat(collectionCalls("clubs"), collectionCalls("pools"))
          .every(
            ([, options]) => !new Headers(options.headers).has("Authorization"),
          ),
      ).toBe(true);
    } finally {
      await cleanup();
      await act(async () => pending.resolve(false));
    }
  },
);

it("retains IDs and order through detail, tabs, whitespace and clearing text", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Niort");
  const initial = collectionCalls("clubs").length;

  // When
  await act(async () => router.push(`/clubs/${secondId}`));
  await screen.findByText("Volley Niort");
  await act(async () => router.back());
  await user.press(screen.getByRole("tab", { name: "Poules" }));
  await screen.findByText("Poule A");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "  \t\u2003");
  await user.clear(screen.getByLabelText("Rechercher"));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByRole("header", { name: "2 résultats chargés" });
  await user.press(
    screen.getByRole("button", { name: "Effacer la recherche" }),
  );

  // Then
  expect(
    await screen.findByRole("header", { name: "Exemples" }),
  ).toBeOnTheScreen();
  expect(screen.getAllByText("Volley")).toHaveLength(2);
  expect(collectionCalls("clubs")).toHaveLength(initial + 1);

  // When: an existing owner requests a reread.
  await act(async () =>
    client.refetchQueries({ queryKey: ["discovery-examples"], type: "active" }),
  );

  // Then
  expect(
    new URL(collectionCalls("clubs").at(-1)![0]).searchParams.getAll(
      "exampleIds",
    ),
  ).toEqual([firstId, secondId]);
});

it("retains usable data on failure and never refills a restricted selection reduced to zero", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Niort");
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.reject(new TypeError("offline"))
      : publicReads(url),
  );

  // When
  await act(async () =>
    client.refetchQueries({ queryKey: ["discovery-examples"], type: "active" }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Niort")).toBeOnTheScreen();
  expect(screen.queryByText(/Aucun résultat/)).not.toBeOnTheScreen();
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.resolve(Response.json({ clubs: [] }))
      : publicReads(url),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByText("Aucun résultat pour ces critères");
  const calls = collectionCalls("clubs").length;
  await user.paste(screen.getByLabelText("Rechercher"), " \u2003");
  await user.press(screen.getByRole("tab", { name: "Poules" }));
  await screen.findByText("Poule A");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await act(async () =>
    client.refetchQueries({ queryKey: ["discovery-examples"], type: "active" }),
  );

  // Then
  expect(
    screen.getByText("Aucun résultat pour ces critères"),
  ).toBeOnTheScreen();
  expect(collectionCalls("clubs")).toHaveLength(calls);
  expect(
    new URL(collectionCalls("clubs").at(-1)![0]).searchParams.getAll(
      "exampleIds",
    ),
  ).toEqual([firstId, secondId]);
});

it("selects again for changed filters and resets to the current default season", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await screen.findByText("Club public");
  expect(collectionCalls("teams").map(([url]) => url)).toEqual([
    expect.stringContaining("seasonId=" + season.id),
  ]);

  // When
  await user.press(screen.getByRole("button", { name: "Filtres" }));
  await user.press(await screen.findByRole("button", { name: "Genre" }));
  await user.press(await screen.findByRole("radio", { name: "Féminin" }));
  await user.press(
    await screen.findByRole("button", { name: "Appliquer les filtres" }),
  );
  await screen.findByText("Club public");

  // Then
  const filtered = new URL(collectionCalls("teams").at(-1)![0]);
  expect(filtered.searchParams.get("gender")).toBe("female");
  expect(filtered.searchParams.has("exampleIds")).toBe(false);

  // When
  await user.press(screen.getByRole("button", { name: "Effacer" }));
  await screen.findByText("Club public");

  // Then
  const reset = new URL(collectionCalls("teams").at(-1)![0]);
  expect(reset.searchParams.get("seasonId")).toBe(season.id);
  expect(reset.searchParams.has("gender")).toBe(false);
  expect(reset.searchParams.has("exampleIds")).toBe(false);
});

it("retains benign example cards after a detail refusal until their own refresh", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Niort");
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith(`/clubs/${secondId}`)
      ? Promise.resolve(Response.json({}, { status: 404 }))
      : publicReads(url),
  );

  // When
  await act(async () => router.push(`/clubs/${secondId}`));
  await screen.findByRole("alert");
  await act(async () => router.back());

  // Then
  expect(await screen.findByText("Niort")).toBeOnTheScreen();

  // When
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.resolve(Response.json({ clubs: [] }))
      : publicReads(url),
  );
  await act(async () =>
    client.refetchQueries({ queryKey: ["discovery-examples"], type: "active" }),
  );

  // Then
  await screen.findByText("Aucun résultat pour ces critères");
  expect(screen.queryByText("Niort")).not.toBeOnTheScreen();
});

it("keeps an initial example failure retryable instead of presenting an empty catalogue", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/teams")
      ? Promise.reject(new TypeError("offline"))
      : publicReads(url),
  );
  const user = userEvent.setup();
  await renderSearch();

  // When
  await screen.findByRole("alert");

  // Then
  expect(screen.queryByText(/Aucun résultat/)).not.toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Exemples" })).toBeOnTheScreen();
  expect(collectionCalls("teams")).toHaveLength(1);
  mockFetch.mockImplementation(publicReads);

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Club public")).toBeOnTheScreen();
  expect(collectionCalls("teams")).toHaveLength(2);
});

it("keeps an explicitly reselected default season in the same example mode", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await screen.findByText("Club public");
  const reads = collectionCalls("teams").length;

  // When
  await user.press(screen.getByRole("button", { name: "Filtres" }));
  await user.press(await screen.findByRole("button", { name: "Saison" }));
  await user.press(await screen.findByRole("radio", { name: "2026/2027" }));
  await user.press(
    await screen.findByRole("button", { name: "Appliquer les filtres" }),
  );

  // Then
  expect(await screen.findByText("Club public")).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Exemples" })).toBeOnTheScreen();
  expect(collectionCalls("teams")).toHaveLength(reads);
});

it("starts a new selection on a new visit even with the previous query cache retained", async () => {
  // Given
  await renderSearch();
  await screen.findByText("Club public");
  await cleanup();
  const reads = collectionCalls("teams").length;

  // When
  await renderSearch();
  await screen.findByText("Club public");

  // Then
  expect(collectionCalls("teams")).toHaveLength(reads + 1);
  expect(
    new URL(collectionCalls("teams").at(-1)![0]).searchParams.has("exampleIds"),
  ).toBe(false);
});

it("allows a new visit to select an identity whose previous detail refusal is still cached", async () => {
  // Given: the old visit removes Niort after the real F03 detail returns 404.
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Niort");
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith(`/clubs/${secondId}`)
      ? Promise.resolve(Response.json({ status: 404 }, { status: 404 }))
      : publicReads(url),
  );
  await act(async () => router.push(`/clubs/${secondId}`));
  await screen.findByRole("alert");
  await act(async () => router.back());
  expect(screen.getByText("Niort")).toBeOnTheScreen();
  await act(async () => router.replace("/home"));
  await screen.findByText("Accueil de test");
  mockFetch.mockImplementation(publicReads);

  // When: new current backend authority admits the identity in a new visit.
  await act(async () => router.replace("/search"));
  await user.press(screen.getByRole("tab", { name: "Clubs" }));

  // Then
  expect(await screen.findByText("Niort")).toBeOnTheScreen();
  expect(
    new URL(collectionCalls("clubs").at(-1)![0]).searchParams.has("exampleIds"),
  ).toBe(false);

  // When: a reopened detail read is abandoned before it can establish new authority.
  const pending = Promise.withResolvers<Response>();
  let signal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, options: RequestInit) => {
    if (new URL(url).pathname.endsWith(`/clubs/${secondId}`)) {
      signal = options.signal ?? undefined;
      return pending.promise;
    }
    return publicReads(url);
  });
  await act(async () => router.push(`/clubs/${secondId}`));
  await waitFor(() => expect(signal).toBeDefined());
  await act(async () => router.back());
  await act(async () =>
    pending.resolve(
      await publicReads(`https://api.example.invalid/clubs/${secondId}`),
    ),
  );

  // Then: native cancellation restores the historical error, which must not remove current examples.
  expect(signal?.aborted).toBe(true);
  expect(screen.getByText("Niort")).toBeOnTheScreen();
});

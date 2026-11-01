import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
} from "react";
import {
  useQueryClient,
  type QueryClient,
  QueryClientProvider,
  useQuery,
  focusManager,
  onlineManager,
  type InfiniteData,
} from "@tanstack/react-query";
import "../../../shared/native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Text } from "react-native";
import ClubRoute from "../../../app/(ordinary)/clubs/[clubId]";
import SupportLayout from "../../../app/(ordinary)/support/_layout";
import { SupportScreen } from "../../support/screens/support-screen";
import { AccessAdmissionProvider } from "../../access/queries/use-access-admission";
import { useConsultationQueries } from "../../sporting/match-consultation";
import { renderRouter } from "expo-router/testing-library";
import { type DiscoveryPage } from "../api/discovery-queries";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import SearchLayout from "../../../app/(ordinary)/(tabs)/search/_layout";
import { SearchScreen } from "../screens/search-screen";
import { SearchFilters } from "../components/search-filters";
import { SearchFilterChoice } from "../components/search-filter-choice";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
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
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
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

/** Only HTTP is controlled: generated transport, Query, admission, session, shared paging and Router stay real. */
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
        nextCursor: "next",
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
  mockAuth0.getCredentials.mockReset();
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(publicReads);
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Mounts real query/session/navigation owners and all declared support routes; HTTP and native layout are controlled. */
async function renderSearch() {
  const result = await renderRouter(
    {
      _layout: () => (
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      ),
      "search/_layout": SearchLayout,
      "search/index": SearchScreen,
      "search/(sheets)/filters": SearchFilters,
      "search/(sheets)/choice": SearchFilterChoice,
      "clubs/[clubId]": ClubRoute,
      "support/_layout": SupportLayout,
      "support/index": SupportScreen,
      "support/choice": () => null,
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
              <ThemeProvider>
                <ApplicationAccessProvider>
                  <AccountSessionProvider>
                    <PrivateQueries>
                      <AccessAdmissionProvider>
                        <AccountFeedbackProvider>
                          <AdvertisingProviders>
                            {children}
                          </AdvertisingProviders>
                        </AccountFeedbackProvider>
                      </AccessAdmissionProvider>
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
  return result;
}

/** F03's real child refusal timestamps the existing parent key; no Search restriction is fabricated. */
function PoolChildRead() {
  const queries = useConsultationQueries();
  useQuery({ ...queries.pool(firstId), enabled: false });
  const read = useQuery(queries.standings(firstId));
  return (
    <Text>{read.isError ? "Poule indisponible" : "Lecture du classement"}</Text>
  );
}

it.each([401, 403, 404, "network"] as const)(
  "keeps benign text cards until their own refresh after a detail %s outcome",
  async (outcome) => {
    // Given: the exact F03 route is opened externally; card activation belongs to T031.
    const user = userEvent.setup();
    await renderSearch();
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    await user.paste(screen.getByLabelText("Rechercher"), "Volley");
    await screen.findByText("Niort");
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/clubs")
        ? Promise.reject(new TypeError("offline"))
        : publicReads(url),
    );
    await act(async () =>
      client.refetchQueries({
        predicate: ({ queryKey }) =>
          ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
        type: "active",
      }),
    );
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith(`/clubs/${secondId}`)
        ? outcome === "network"
          ? Promise.reject(new TypeError("private detail diagnostic"))
          : Promise.resolve(
              Response.json({ status: outcome }, { status: outcome }),
            )
        : publicReads(url),
    );
    const reads = mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/clubs"),
    ).length;

    // When
    await act(async () => router.push(`/clubs/${secondId}`));
    await screen.findByRole("alert");
    await act(async () => router.back());

    // Then: refusal removes only its UUID; a network failure preserves the still-permitted result.
    expect(screen.getByText("Lyon")).toBeOnTheScreen();
    expect(screen.getByText("Niort")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/clubs"),
      ),
    ).toHaveLength(reads);
    expect(
      screen.queryByText("private detail diagnostic"),
    ).not.toBeOnTheScreen();
  },
);

it("opens the existing support form from failed Search without publishing the editable query and returns to its context", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/teams") &&
    new URL(url).searchParams.has("gender")
      ? Promise.reject(new TypeError("private upstream diagnostic"))
      : publicReads(url),
  );
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(
    screen.getByLabelText("Rechercher"),
    "Saisie confidentielle",
  );
  await user.press(screen.getByRole("button", { name: "Filtres" }));
  await user.press(await screen.findByRole("button", { name: "Genre" }));
  await user.press(await screen.findByRole("radio", { name: "Féminin" }));
  await user.press(
    await screen.findByRole("button", { name: "Appliquer les filtres" }),
  );
  await screen.findByRole("alert");
  const reads = mockFetch.mock.calls.length;

  // When
  await user.press(
    screen.getByRole("button", { name: "Signaler un problème" }),
  );

  // Then: the real F10 layout/form receives only its allowlisted origin, with no submit effect.
  expect(
    await screen.findByText("Assistance et suggestions"),
  ).toBeOnTheScreen();
  expect(screen.getByText("Recherche")).toBeOnTheScreen();
  expect(screen).toHavePathname("/support");
  expect(screen).toHaveSearchParams({ originScreen: "search" });
  expect(
    screen.queryByDisplayValue("Saisie confidentielle"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByText("private upstream diagnostic"),
  ).not.toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(reads);

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(screen).toHavePathname("/search");
  expect(
    screen.getByRole("tab", { name: "Équipes", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Saisie confidentielle")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Filtres actifs" }),
  ).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(reads);
});

it("keeps both authorized pages after a failed reread and explicitly retries the whole traversal", async () => {
  // Given: accepted pages and their cursor belong to the same real infinite Query.
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Niort");
  mockFetch.mockImplementation((url: string) =>
    new URL(url).searchParams.has("cursor")
      ? Promise.resolve(
          Response.json({
            clubs: [
              {
                club: {
                  id: "cccccccc-0000-4000-8000-000000000003",
                  name: "Dernier club",
                },
              },
            ],
          }),
        )
      : publicReads(url),
  );
  await fireEvent(
    screen.getByLabelText("Résultats de recherche"),
    "endReached",
  );
  await screen.findByText("Dernier club");
  const accepted = client.getQueriesData<InfiniteData<DiscoveryPage>>({
    predicate: ({ queryKey }) =>
      ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
    type: "active",
  });
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.reject(new TypeError("private upstream payload"))
      : publicReads(url),
  );

  // When: an existing owner requests a reread; no Search refresh gesture is introduced.
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
      type: "active",
    }),
  );

  // Then
  const retry = await screen.findByRole("button", { name: "Réessayer" });
  expect(screen.getByText("Niort")).toBeOnTheScreen();
  expect(screen.getByText("Dernier club")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
  expect(
    client.getQueriesData({
      predicate: ({ queryKey }) =>
        ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
      type: "active",
    }),
  ).toEqual(accepted);
  expect(
    screen.queryByText(
      /Aucun résultat|Fin des résultats|private upstream payload/,
    ),
  ).not.toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: /Actualiser|Rafraîchir/ }),
  ).not.toBeOnTheScreen();
  const attempts = mockFetch.mock.calls.length;
  await fireEvent(screen.getByLabelText("Résultats de recherche"), "refresh");
  await fireEvent(
    screen.getByLabelText("Résultats de recherche"),
    "endReached",
  );
  expect(mockFetch).toHaveBeenCalledTimes(attempts);
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.resolve(
          Response.json({
            clubs: [{ club: { id: firstId, name: "Résultat actuel" } }],
          }),
        )
      : publicReads(url),
  );

  // When
  await user.press(retry);

  // Then: Query accepts a replacement that establishes exhaustion, without appending old pages.
  expect(await screen.findByText("Résultat actuel")).toBeOnTheScreen();
  expect(screen.queryByText(/Niort|Dernier club/)).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  const retriedUrl = new URL(mockFetch.mock.calls.at(-1)?.[0]);
  expect(retriedUrl.searchParams.get("q")).toBe("Volley");
  expect(retriedUrl.searchParams.has("cursor")).toBe(false);
});

it("does not present a retained empty response as certain absence after a failed reread", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.resolve(Response.json({ clubs: [] }))
      : publicReads(url),
  );
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Aucun résultat pour ces critères");
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.reject(new TypeError("offline"))
      : publicReads(url),
  );

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
      type: "active",
    }),
  );

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Une erreur est survenue",
  );
  expect(
    screen.queryByText("Aucun résultat pour ces critères"),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
});

it("retries a failed initial read through its card without losing criteria", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.reject(new TypeError("offline"))
      : publicReads(url),
  );
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByRole("alert");
  const clubAttempts = () =>
    mockFetch.mock.calls.filter(
      ([url]) =>
        new URL(url).pathname.endsWith("/clubs") &&
        new URL(url).searchParams.get("q") === "Volley",
    );
  expect(clubAttempts()).toHaveLength(1);

  mockFetch.mockImplementation(publicReads);

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Niort")).toBeOnTheScreen();
  expect(clubAttempts()).toHaveLength(2);
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it.each([401, 403, 404])(
  "retains benign cards and retry after an established HTTP %i refusal",
  async (status) => {
    // Given: collection refusal is qualified here; propagation from F03 restrictions belongs to T038.
    const user = userEvent.setup();
    await renderSearch();
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    await user.paste(screen.getByLabelText("Rechercher"), "Volley");
    await screen.findByText("Niort");
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/clubs")
        ? Promise.resolve(Response.json({ status }, { status }))
        : publicReads(url),
    );

    // When
    await act(async () =>
      client.refetchQueries({
        predicate: ({ queryKey }) =>
          ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
        type: "active",
      }),
    );

    // Then
    expect(
      await screen.findByRole("button", { name: "Réessayer" }),
    ).toBeEnabled();
    expect(screen.getByText("Niort")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
    expect(
      screen.queryByText("Aucun résultat pour ces critères"),
    ).not.toBeOnTheScreen();
  },
);

it.each(["text", "tab", "filter"])(
  "rejects a late successful response after changing the current %s",
  async (change) => {
    // Given: the transport deliberately ignores abort until its response is delivered.
    const pending = Promise.withResolvers<Response>();
    let signal: AbortSignal | undefined;
    mockFetch.mockImplementation((url: string, options: RequestInit) => {
      const parsed = new URL(url);
      if (
        parsed.pathname.endsWith("/teams") &&
        parsed.searchParams.get("q") === "Volley" &&
        !parsed.searchParams.has("gender")
      ) {
        signal = options.signal ?? undefined;
        return pending.promise;
      }
      return publicReads(url);
    });
    const user = userEvent.setup();
    await renderSearch();
    await user.paste(screen.getByLabelText("Rechercher"), "Volley");
    await waitFor(() => expect(signal).toBeDefined());

    // When
    if (change === "text") {
      await user.clear(screen.getByLabelText("Rechercher"));
      await user.paste(screen.getByLabelText("Rechercher"), "Eagles");
    } else if (change === "tab") {
      await user.press(screen.getByRole("tab", { name: "Clubs" }));
    } else {
      await user.press(screen.getByRole("button", { name: "Filtres" }));
      await user.press(await screen.findByRole("button", { name: "Genre" }));
      await user.press(await screen.findByRole("radio", { name: "Féminin" }));
      await user.press(
        await screen.findByRole("button", { name: "Appliquer les filtres" }),
      );
    }
    await screen.findByText(change === "tab" ? "Niort" : "Club public");
    await act(async () =>
      pending.resolve(
        Response.json({
          teams: [
            {
              team: { id: secondId, name: "Ancien contexte" },
              season,
              classification: {},
              professional: false,
            },
          ],
        }),
      ),
    );

    // Then
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByText("Ancien contexte")).not.toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(
      screen.getByDisplayValue(change === "text" ? "Eagles" : "Volley"),
    ).toBeOnTheScreen();
  },
);

it("preserves applied filters and all accepted pages when the second reread page fails", async () => {
  // Given: a first reread page succeeds, but the entire replacement is not yet accepted.
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Club public");
  await user.press(screen.getByRole("button", { name: "Filtres" }));
  await user.press(await screen.findByRole("button", { name: "Genre" }));
  await user.press(await screen.findByRole("radio", { name: "Féminin" }));
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/teams")
      ? Promise.resolve(
          Response.json({
            teams: [
              {
                team: {
                  id: new URL(url).searchParams.has("cursor")
                    ? secondId
                    : firstId,
                  name: new URL(url).searchParams.has("cursor")
                    ? "Deuxième page"
                    : "Première page",
                },
                season,
                classification: {},
                professional: false,
              },
            ],
            ...(new URL(url).searchParams.has("cursor")
              ? {}
              : { nextCursor: "page-two" }),
          }),
        )
      : publicReads(url),
  );
  await user.press(
    await screen.findByRole("button", { name: "Appliquer les filtres" }),
  );
  await screen.findByText("Première page");
  await fireEvent(
    screen.getByLabelText("Résultats de recherche"),
    "endReached",
  );
  await screen.findByText("Deuxième page");
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/teams")) return publicReads(url);
    if (parsed.searchParams.has("cursor"))
      return Promise.reject(new TypeError("offline"));
    return Promise.resolve(
      Response.json({
        teams: [
          {
            team: { id: firstId, name: "Remplacement incomplet" },
            season,
            classification: {},
            professional: false,
          },
        ],
        nextCursor: "current-next",
      }),
    );
  });

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
      type: "active",
    }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Première page")).toBeOnTheScreen();
  expect(screen.getByText("Deuxième page")).toBeOnTheScreen();
  expect(screen.queryByText("Remplacement incomplet")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Filtres actifs" }),
  ).toBeOnTheScreen();
  const attempted = new URL(mockFetch.mock.calls.at(-1)?.[0]);
  expect(Object.fromEntries(attempted.searchParams)).toEqual({
    q: "Volley",
    gender: "female",
    seasonId: season.id,
    cursor: "current-next",
  });
});

it("cancels a pending append when a reread fails without admitting its late page", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  let appendSignal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, options: RequestInit) => {
    if (new URL(url).searchParams.has("cursor")) {
      appendSignal = options.signal ?? undefined;
      return pending.promise;
    }
    return publicReads(url);
  });
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Niort");
  await fireEvent(
    screen.getByLabelText("Résultats de recherche"),
    "endReached",
  );
  await waitFor(() => expect(appendSignal).toBeDefined());
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.reject(new TypeError("offline"))
      : publicReads(url),
  );

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
      type: "active",
    }),
  );
  await act(async () =>
    pending.resolve(
      Response.json({
        clubs: [{ club: { id: secondId, name: "Page obsolète" } }],
      }),
    ),
  );

  // Then
  expect(appendSignal?.aborted).toBe(true);
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Niort")).toBeOnTheScreen();
  expect(screen.queryByText("Page obsolète")).not.toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

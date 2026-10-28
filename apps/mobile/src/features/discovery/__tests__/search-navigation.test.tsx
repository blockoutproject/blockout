import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FlatList } from "react-native";
import { router, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import type { DiscoveryPage } from "../api/discovery-queries";
import { uniqueSearchResults } from "../model/search-result";
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
import ClubRoute from "../../../app/(ordinary)/clubs/[clubId]";
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
let client = createQueryClient();

/** Only HTTP is controlled: generated transport, Query, admission, session, RNCT and Router stay real. */
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

beforeEach(() => {
  client = createQueryClient();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials.mockReset();
  mockFetch.mockReset().mockImplementation(publicReads);
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** The exact club route is opened externally here; card activation/F11 wiring belongs to F04 T031. */
async function renderSearch() {
  const result = await renderRouter(
    {
      _layout: () => (
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      ),
      "search/_layout": SearchLayout,
      "search/index": SearchScreen,
      "search/filters": SearchFilters,
      "search/choice": SearchFilterChoice,
      "clubs/[clubId]": ClubRoute,
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
            <QueryClientProvider client={client}>
              <ThemeProvider>
                <ApplicationAccessProvider>
                  <AccountSessionProvider>
                    <AccountFeedbackProvider>
                      {children}
                    </AccountFeedbackProvider>
                  </AccountSessionProvider>
                </ApplicationAccessProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      ),
    },
  );
  await layoutNativeTabs();
  return result;
}

it("announces each namesake with its available public context", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");

  // When / Then
  expect(
    await screen.findByLabelText(
      "Volley, Club public, 2026/2027, 6 × 6, Féminin",
    ),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("tab", { name: "Poules" }));
  expect(
    await screen.findByLabelText("Poule A, Ligue publique · Finale, 2026/2027"),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  expect(await screen.findByLabelText("Volley, Lyon")).toBeOnTheScreen();
  expect(screen.getByLabelText("Volley, Niort")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/logo")),
  ).toBe(false);
});

it.each(["network", "schema", "http"])(
  "keeps loaded namesakes through %s append failure and retries the same cursor before reaching a real end",
  async (failure) => {
    // Given
    const pending = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url: string) =>
      new URL(url).searchParams.has("cursor")
        ? pending.promise
        : publicReads(url),
    );
    const user = userEvent.setup();
    await renderSearch();
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    await user.paste(screen.getByLabelText("Rechercher"), "Volley");
    await screen.findByText("Niort");

    // When
    await fireEvent(
      screen.getByLabelText("Résultats de recherche"),
      "endReached",
    );

    // Then
    expect(
      await screen.findByRole("progressbar", { name: "Chargement en cours" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Niort")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "2 résultats chargés" }),
    ).toBeOnTheScreen();

    // When
    await fireEvent(
      screen.getByLabelText("Résultats de recherche"),
      "endReached",
    );
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(String(url)).searchParams.has("cursor"),
      ),
    ).toHaveLength(1);
    await act(async () => {
      if (failure === "network")
        pending.reject(new TypeError("private transport diagnostic"));
      else if (failure === "schema")
        pending.resolve(
          Response.json({ clubs: [{ club: { id: firstId, name: 42 } }] }),
        );
      else pending.resolve(Response.json({ status: 500 }, { status: 500 }));
    });
    const retry = await screen.findByRole("button", {
      name: /Une erreur est survenue/,
    });
    const attempts = mockFetch.mock.calls.length;
    await fireEvent(
      screen.getByLabelText("Résultats de recherche"),
      "endReached",
    );

    // Then: reaching the edge again must not silently replay the failed page.
    expect(mockFetch).toHaveBeenCalledTimes(attempts);
    expect(screen.getByText("Niort")).toBeOnTheScreen();
    expect(
      screen.queryByText(/Fin des résultats|private transport diagnostic/),
    ).not.toBeOnTheScreen();
    mockFetch.mockImplementation((url: string) =>
      new URL(url).searchParams.has("cursor")
        ? Promise.resolve(
            Response.json({
              clubs: [
                { club: { id: firstId.toUpperCase(), name: "Volley actuel" } },
                {
                  club: {
                    id: "cccccccc-0000-4000-8000-000000000003",
                    name: "Volley",
                  },
                  city: "Tours",
                },
              ],
            }),
          )
        : publicReads(url),
    );

    // When
    await user.press(retry);

    // Then
    expect(
      await screen.findByRole("header", { name: "3 résultats chargés" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Volley actuel")).toBeOnTheScreen();
    expect(screen.getByText("Niort")).toBeOnTheScreen();
    expect(screen.getByText("Tours")).toBeOnTheScreen();
    expect(screen.queryByText("Lyon")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: /Réessayer/ }),
    ).not.toBeOnTheScreen();
    const completedAttempts = mockFetch.mock.calls.length;
    await fireEvent(
      screen.getByLabelText("Résultats de recherche"),
      "endReached",
    );
    expect(mockFetch).toHaveBeenCalledTimes(completedAttempts);
    expect(
      mockFetch.mock.calls
        .filter(([url]) => new URL(String(url)).searchParams.has("cursor"))
        .map(([url]) => new URL(String(url)).searchParams.get("cursor")),
    ).toEqual(["next", "next"]);
    expect(
      client.getQueryCache().findAll({
        queryKey: ["discovery"],
        predicate: (query) => query.state.data !== undefined,
      }),
    ).toHaveLength(1);
    expect(
      screen.queryByText(/Fin des résultats|sur 3|3 résultats au total/),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText("Actualiser les données"),
    ).not.toBeOnTheScreen();
  },
);

it("retains the selected context and loaded pages across an externally opened exact F03 sheet", async () => {
  // Given: this exercises Router/F03, without claiming card activation or native offset geometry.
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Niort");
  const scroll = jest.spyOn(FlatList.prototype, "scrollToOffset");

  // When
  await act(async () =>
    router.push({ pathname: "/clubs/[clubId]", params: { clubId: secondId } }),
  );
  await screen.findByText("Volley Niort");
  mockFetch.mockClear();
  await act(async () => router.back());

  // Then
  expect(
    await screen.findByRole("tab", { name: "Clubs", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue("Volley");
  expect(screen.getByText("Niort")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "2 résultats chargés" }),
  ).toBeOnTheScreen();
  expect(scroll).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("traverses all 47 stable identities through three pages in one context", async () => {
  // Given: no total is supplied, and each generated envelope contains at most twenty summaries.
  const clubs = Array.from({ length: 47 }, (_, index) => ({
    club: {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name: `Volley ${index + 1}`,
    },
  }));
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/clubs")) return publicReads(url);
    const start = Number(parsed.searchParams.get("cursor") ?? 0);
    return Promise.resolve(
      Response.json({
        clubs: clubs.slice(start, start + 20),
        ...(start + 20 < clubs.length
          ? { nextCursor: String(start + 20) }
          : {}),
      }),
    );
  });
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByRole("header", { name: "20 résultats chargés" });

  // When
  await fireEvent(
    screen.getByLabelText("Résultats de recherche"),
    "endReached",
  );
  await screen.findByRole("header", { name: "40 résultats chargés" });
  await fireEvent(
    screen.getByLabelText("Résultats de recherche"),
    "endReached",
  );
  await screen.findByRole("header", { name: "47 résultats chargés" });

  // Then: cache assertions protect the native paging contract, not the viewport's implementation.
  const accepted = client.getQueriesData<InfiniteData<DiscoveryPage>>({
    queryKey: ["discovery"],
    predicate: (query) => query.state.data !== undefined,
  });
  expect(accepted).toHaveLength(1);
  expect(accepted[0][1]?.pageParams).toEqual([undefined, "20", "40"]);
  expect(
    uniqueSearchResults(accepted[0][1]?.pages).map(
      ({ identity }) => identity.id,
    ),
  ).toEqual(clubs.map(({ club }) => club.id));
  expect(
    screen.queryByText(/Fin des résultats|sur 47|47 résultats au total/),
  ).not.toBeOnTheScreen();
  const attempts = mockFetch.mock.calls.length;
  await fireEvent(
    screen.getByLabelText("Résultats de recherche"),
    "endReached",
  );
  expect(mockFetch).toHaveBeenCalledTimes(attempts);
});

it("cancels an old append during an owner-authorized reread and never appends it to the replacement", async () => {
  // Given: the HTTP double deliberately delivers a response after its signal was cancelled.
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
      ? Promise.resolve(
          Response.json({
            clubs: [{ club: { id: secondId, name: "Résultat actuel" } }],
          }),
        )
      : publicReads(url),
  );

  // When: Query owns the controlled reread; Search exposes no refresh gesture or action.
  await act(async () =>
    client.refetchQueries({ queryKey: ["discovery"], type: "active" }),
  );
  await act(async () =>
    pending.resolve(
      Response.json({
        clubs: [{ club: { id: firstId, name: "Page obsolète" } }],
      }),
    ),
  );

  // Then
  expect(appendSignal?.aborted).toBe(true);
  expect(await screen.findByText("Résultat actuel")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "1 résultat chargé" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Page obsolète|Niort|Lyon/)).not.toBeOnTheScreen();
});

it.each(["hidden", "network"])(
  "lets F03 distinguish %s while retaining the Search visit",
  async (outcome) => {
    // Given: the real UUID route has accepted current content before the next F03 read fails.
    const user = userEvent.setup();
    await renderSearch();
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    await user.paste(screen.getByLabelText("Rechercher"), "Volley");
    await screen.findByText("Niort");
    await act(async () =>
      router.push({
        pathname: "/clubs/[clubId]",
        params: { clubId: secondId },
      }),
    );
    await layoutNativeTabs();
    await screen.findByText("Volley Niort");
    mockFetch.mockImplementation((url: string) => {
      if (new URL(url).pathname.endsWith(`/clubs/${secondId}`))
        return outcome === "hidden"
          ? Promise.resolve(Response.json({ status: 404 }, { status: 404 }))
          : Promise.reject(new TypeError("private failure"));
      return publicReads(url);
    });

    // When
    await act(async () =>
      client.refetchQueries({
        queryKey: ["consultation"],
        predicate: (query) => query.queryKey.includes(`/clubs/${secondId}`),
      }),
    );

    // Then: an established refusal removes content, uncertainty retains it; no similar target opens.
    if (outcome === "hidden") {
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Une erreur est survenue",
      );
      expect(screen.queryByText("Volley Niort")).not.toBeOnTheScreen();
    } else expect(screen.getByText("Volley Niort")).toBeOnTheScreen();
    expect(screen.queryByText("private failure")).not.toBeOnTheScreen();
    expect(screen).toHavePathname(`/clubs/${secondId}`);
    await act(async () => router.back());
    expect(await screen.findByText("Niort")).toBeOnTheScreen();
    expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue("Volley");
  },
);

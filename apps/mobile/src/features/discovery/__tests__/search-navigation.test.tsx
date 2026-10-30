import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
} from "react";
import {
  useQueryClient,
  type QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from "@tanstack/react-query";
import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FlatList } from "react-native";
import { router, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
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
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdEventType } from "react-native-google-mobile-ads";
import { createInstallationAdvertisingPrivacy } from "../../advertising/advertising-privacy";
import { AgeDeclarationProvider } from "../../advertising/age-declaration-provider";
import { submitAgeDeclaration } from "../../advertising/age-declaration";
import { controlledInterstitial } from "../../advertising/test-support/interstitial";
import { AccessAdmissionProvider } from "../../access/queries/use-access-admission";
import { ProProvider, usePro } from "../../pro";
import type { ProContext } from "../../pro/pro-provider";
import { mockPurchases } from "../../pro/test-support/native-purchases";
import {
  customerInfo,
  entitlement,
} from "../../pro/test-support/customer-info";
import { accountResponse } from "../../accounts/test-support/account-response";
import * as proSessionModule from "../../pro/pro-session";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import { signInAccount } from "../../pro/test-support/sign-in-account";
import {
  useAccountSession,
  type AccountSession,
} from "../../accounts/session/account-session-provider";
import TeamRoute from "../../../app/(ordinary)/teams/[teamId]";
import PoolRoute from "../../../app/(ordinary)/pools/[poolId]";

jest.mock("react-native-google-mobile-ads", () => ({
  ...jest.requireActual("../../advertising/test-support/native-privacy")
    .nativeAdvertising,
  AdEventType: {
    LOADED: "loaded",
    OPENED: "opened",
    CLOSED: "closed",
    ERROR: "error",
  },
  InterstitialAd: { createForAdRequest: jest.fn(() => mockCreateAd()) },
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        advertising: {
          iosInterstitialUnitId: "synthetic-unit",
          androidInterstitialUnitId: "synthetic-unit",
        },
        revenueCat: { iosApiKey: "test_public", androidApiKey: "test_public" },
      },
    },
  },
}));
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
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

const mockFetch = jest.fn();
const mockCreateAd = jest.fn(controlledInterstitial);
let ad = controlledInterstitial();
let privacy: ReturnType<typeof createInstallationAdvertisingPrivacy>;
let session: AccountSession;
let pro: ProContext;
const environment = { ...process.env };
const firstId = "aaaaaaaa-0000-4000-8000-000000000001";
const secondId = "bbbbbbbb-0000-4000-8000-000000000002";
const season = { id: firstId, label: "2026/2027", startYear: 2026 };
let client: QueryClient;
let publicClient = createQueryClient();

/** Only HTTP is controlled: generated transport, Query, admission, session, RNCT and Router stay real. */
function publicReads(url: string): Promise<Response> {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith("/application-access"))
    return Promise.resolve(Response.json(applicationAccessResponse()));
  if (parsed.pathname.endsWith("/accounts/me"))
    return Promise.resolve(
      Response.json(accountResponse({ accountId: firstId })),
    );
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
  if (parsed.pathname.endsWith(`/teams/${firstId}`))
    return Promise.resolve(
      Response.json({
        team: {
          team: { id: firstId, name: "Selected team" },
          season,
          classification: {},
          professional: false,
        },
        participations: [],
      }),
    );
  if (parsed.pathname.endsWith(`/pools/${firstId}`))
    return Promise.resolve(
      Response.json({
        pool: {
          pool: { id: firstId, name: "Selected pool" },
          season,
          classification: {},
        },
      }),
    );
  if (parsed.pathname.endsWith("/standings"))
    return Promise.resolve(
      Response.json({
        poolId: firstId,
        availability: "unavailable",
        lastAttemptFailed: false,
        columns: [],
        rows: [],
      }),
    );
  if (parsed.pathname.endsWith("/participants"))
    return Promise.resolve(Response.json({ poolId: firstId, items: [] }));
  if (parsed.pathname.endsWith("/matches"))
    return Promise.resolve(
      Response.json({
        category: parsed.searchParams.get("category"),
        timeZone: parsed.searchParams.get("timeZone"),
        evaluatedAt: new Date().toISOString(),
        days: [],
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
  const account = useAccountSession();
  useLayoutEffect(() => {
    session = account;
  }, [account]);
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

beforeEach(async () => {
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  await AsyncStorage.clear();
  await submitAgeDeclaration(18, new Date());
  ad = controlledInterstitial();
  mockCreateAd
    .mockReset()
    .mockImplementationOnce(() => ad)
    .mockImplementation(controlledInterstitial);
  privacy = createInstallationAdvertisingPrivacy();
  publicClient = createQueryClient();
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
  privacy.dispose();
  client?.clear();
  publicClient.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Captures the committed public entitlement owner for controlled native-I/O scenarios. */
function CurrentPro({ children }: QueryFixtureProps) {
  const current = usePro();
  useLayoutEffect(() => {
    pro = current;
  }, [current]);
  return children;
}

/** Mounts production Search and F03 routes with real session, admission and advertising owners. */
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
      "teams/[teamId]": TeamRoute,
      "pools/[poolId]": PoolRoute,
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
                      <AccountFeedbackProvider>
                        <AccessAdmissionProvider>
                          <ProProvider>
                            <AgeDeclarationProvider enabled privacy={privacy}>
                              <CurrentPro>{children}</CurrentPro>
                            </AgeDeclarationProvider>
                          </ProProvider>
                        </AccessAdmissionProvider>
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
      name: "Réessayer",
    });
    expect(
      await screen.findByRole("alert", {
        name: "Une erreur est survenue. Veuillez réessayer plus tard.",
      }),
    ).toBeOnTheScreen();
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
        predicate: (query) =>
          ["/clubs", "/teams", "/pools"].includes(String(query.queryKey[0])) &&
          query.state.data !== undefined,
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

it.each(["criteria", "tab"])(
  "does not announce an obsolete continuation after changing %s",
  async (change) => {
    // Given: HTTP is delayed while the real Query observer and native tab owner change scope.
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
    await fireEvent(
      screen.getByLabelText("Résultats de recherche"),
      "endReached",
    );
    await screen.findByRole("progressbar", { name: "Chargement en cours" });

    // When
    if (change === "criteria") {
      await user.clear(screen.getByLabelText("Rechercher"));
      await user.paste(screen.getByLabelText("Rechercher"), "Eagles");
      await screen.findByText("Niort");
    } else {
      await user.press(screen.getByRole("tab", { name: "Équipes" }));
      await screen.findByLabelText(
        "Volley, Club public, 2026/2027, 6 × 6, Féminin",
      );
    }
    await act(async () =>
      pending.resolve(Response.json({ status: 500 }, { status: 500 })),
    );

    // Then
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue(
      change === "criteria" ? "Eagles" : "Volley",
    );
  },
);

it("opens the selected namesake and retains context and loaded pages on return", async () => {
  // Given: actual card selection exercises Router/F03, without claiming native offset geometry.
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Niort");
  const scroll = jest.spyOn(FlatList.prototype, "scrollToOffset");

  // When
  await user.press(screen.getByRole("link", { name: "Volley, Niort" }));
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
    if (!parsed.searchParams.get("q"))
      return Promise.resolve(Response.json({ clubs: clubs.slice(0, 5) }));
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
    predicate: (query) =>
      ["/clubs", "/teams", "/pools"].includes(String(query.queryKey[0])) &&
      query.state.data !== undefined,
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
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
      type: "active",
    }),
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
    await user.press(screen.getByRole("link", { name: "Volley, Niort" }));
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
    expect(await screen.findByText("Lyon")).toBeOnTheScreen();
    if (outcome === "network")
      expect(screen.getByText("Niort")).toBeOnTheScreen();
    expect(
      screen.getByRole("tab", { name: "Clubs", selected: true }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue("Volley");
  },
);

/** Prepares nine genuine card openings and returns; F11 alone owns their threshold. */
async function nineOpenings() {
  const user = userEvent.setup();
  await renderSearch();
  await waitFor(() => expect(mockCreateAd).toHaveBeenCalledTimes(1));
  await act(async () => ad.emit(AdEventType.LOADED));
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  for (let index = 0; index < 9; index++) {
    await user.press(
      await screen.findByRole("link", { name: "Volley, Niort" }),
    );
    await screen.findByText("Volley Niort");
    await act(async () => router.back());
  }
  expect(ad.show).not.toHaveBeenCalled();
  return user;
}

it.each([
  [
    "Équipes",
    "Volley, Club public, 2026/2027, 6 × 6, Féminin",
    "teams",
    "Selected team",
  ],
  [
    "Poules",
    "Poule A, Ligue publique · Finale, 2026/2027",
    "pools",
    "Selected pool",
  ],
])(
  "opens the exact %s UUID from an example card",
  async (tab, label, path, title) => {
    // Given
    const user = userEvent.setup();
    await renderSearch();
    await user.press(screen.getByRole("tab", { name: tab }));

    // When
    await user.press(await screen.findByRole("link", { name: label }));

    // Then
    expect(screen).toHavePathname(`/${path}/${firstId}`);
    expect(await screen.findByText(title)).toBeOnTheScreen();
  },
);

it("counts only card openings and releases the tenth namesake once after the shared ad", async () => {
  // Given: returning nine times has not triggered the tenth placement.
  const user = await nineOpenings();

  // When: tab, filter sheet, criteria, scrolling and owner reread are ordinary search actions.
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await user.press(screen.getByRole("button", { name: "Filtres" }));
  await user.press(
    screen.getByRole("button", { name: "Appliquer les filtres" }),
  );
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.clear(screen.getByLabelText("Rechercher"));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await fireEvent(
    await screen.findByLabelText("Résultats de recherche"),
    "scroll",
    {
      nativeEvent: {
        contentOffset: { x: 0, y: 200 },
        contentSize: { width: 390, height: 1200 },
        layoutMeasurement: { width: 390, height: 844 },
      },
    },
  );
  await act(async () =>
    client.refetchQueries({ queryKey: ["/clubs"], type: "active" }),
  );
  expect(ad.show).not.toHaveBeenCalled();
  const card = await screen.findByRole("link", { name: "Volley, Niort" });
  await user.press(card);
  await user.press(card);
  await user.press(screen.getByRole("link", { name: "Volley, Lyon" }));

  // Then
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(screen).toHavePathname("/search");
  await act(async () => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
  });
  expect(screen).toHavePathname(`/clubs/${secondId}`);
  expect(await screen.findByText("Volley Niort")).toBeOnTheScreen();
  await act(async () => router.back());
  expect(screen).toHavePathname("/search");
  expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue("Volley");
});

it.each(["show rejection", "native error"])(
  "releases the selected F03 target after %s",
  async (failure) => {
    // Given
    const user = await nineOpenings();
    if (failure === "show rejection")
      ad.show.mockRejectedValueOnce(new Error("Synthetic SDK failure"));

    // When
    await user.press(screen.getByRole("link", { name: "Volley, Niort" }));
    if (failure === "native error")
      await act(async () => ad.emit(AdEventType.ERROR));
    await screen.findByText("Volley Niort");
    await act(async () => ad.emit(AdEventType.CLOSED));

    // Then
    expect(ad.show).toHaveBeenCalledTimes(1);
    expect(screen).toHavePathname(`/clubs/${secondId}`);
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    await act(async () => router.back());
    expect(screen).toHavePathname("/search");
  },
);

it.each(["tab", "route", "principal", "admission"])(
  "abandons the pending search opening after losing its current %s",
  async (change) => {
    // Given
    const user = await nineOpenings();
    await user.press(screen.getByRole("link", { name: "Volley, Niort" }));
    expect(ad.show).toHaveBeenCalledTimes(1);

    // When
    if (change === "tab")
      await user.press(screen.getByRole("tab", { name: "Équipes" }));
    else if (change === "route")
      await act(async () => router.push("/search/filters"));
    else if (change === "principal")
      await act(async () => {
        await signInAccount(session, firstId);
      });
    else {
      const access = applicationAccessResponse();
      access.maintenance = {
        revision: 1,
        active: true,
        message: null,
        imageUrl: null,
      };
      mockFetch.mockImplementation((url: string) =>
        new URL(url).pathname.endsWith("/application-access")
          ? Promise.resolve(Response.json(access))
          : publicReads(url),
      );
      await act(async () => publicClient.refetchQueries());
      await waitFor(() => expect(privacy.getSnapshot().choices).toBeNull());
    }
    await act(async () => {
      ad.emit(AdEventType.OPENED);
      ad.emit(AdEventType.CLOSED);
    });

    // Then
    expect(screen).not.toHavePathname(`/clubs/${secondId}`);
    expect(screen.queryByText("Volley Niort")).not.toBeOnTheScreen();
  },
);

it.each(["inactive", "active", "unavailable"])(
  "keeps public card navigation available with current %s Pro rights",
  async (status) => {
    // Given: authenticated native identity and actual F09 state, with only store I/O controlled.
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor("auth0|synthetic"),
    );
    const info = customerInfo({
      active: status === "active" ? { "Blockout Pro": entitlement() } : {},
      all: {},
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    });
    mockPurchases.logIn.mockResolvedValue({
      customerInfo: info,
      created: false,
    });
    if (status === "unavailable")
      mockPurchases.getCustomerInfo.mockRejectedValue(
        new Error("Synthetic store outage"),
      );
    else mockPurchases.getCustomerInfo.mockResolvedValue(info);
    const user = userEvent.setup();
    await renderSearch();
    await waitFor(() => expect(pro.state.status).toBe(status));
    if (status === "inactive") {
      await waitFor(() => expect(mockCreateAd).toHaveBeenCalledTimes(1));
      await act(async () => ad.emit(AdEventType.LOADED));
    }
    await user.press(screen.getByRole("tab", { name: "Clubs" }));

    // When
    for (let index = 0; index < 10; index++) {
      await user.press(
        await screen.findByRole("link", { name: "Volley, Niort" }),
      );
      if (index === 9 && status === "inactive") {
        expect(ad.show).toHaveBeenCalledTimes(1);
        await act(async () => {
          ad.emit(AdEventType.OPENED);
          ad.emit(AdEventType.CLOSED);
        });
      }
      await screen.findByText("Volley Niort");
      await act(async () => router.back());
    }

    // Then
    expect(screen).toHavePathname("/search");
    expect(ad.show).toHaveBeenCalledTimes(status === "inactive" ? 1 : 0);
  },
);

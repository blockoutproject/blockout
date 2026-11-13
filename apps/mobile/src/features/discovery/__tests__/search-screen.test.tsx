import { AdvertisingProviders } from "@/features/advertising/test-support/advertising-providers";
import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
  PropsWithChildren,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { layoutNativeTabs } from "@/shared/native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SearchVisitProvider } from "../forms/search-visit";
import { AccountFeedbackProvider } from "@/features/accounts/test-support/account-feedback-provider";
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import {
  cleanup,
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { SearchScreen } from "../screens/search-screen";
import { useDiscoveryQuery } from "../api/use-discovery-query";
import { createDiscoveryContext } from "../api/discovery-context";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import {
  mockAuth0,
  credentialsFor,
} from "@/features/accounts/test-support/native-auth0";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import {
  AccessAdmissionProvider,
  useAccessAdmission,
} from "@/features/access/queries/use-access-admission";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";

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
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useNavigation: () => ({ isFocused: mockIsFocused }),
}));
jest.mock("@/shared/api/binary-image-preview", () => ({
  binaryImagePreview: jest
    .fn()
    .mockResolvedValue("data:image/png;base64,c3ludGhldGlj"),
}));

const mockFetch = jest.fn();
const mockIsFocused = jest.fn(() => true);
const environment = { ...process.env };
const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const season = { id: firstId, label: "2026/2027", startYear: 2026 };
let client: QueryClient;
let publicClient = createQueryClient();

/** Controls HTTP only; generation, response validation, Query, session and admission stay real. */
function publicReads(url: string): Promise<Response> {
  const path = new URL(url).pathname;
  if (path.endsWith("/application-access")) {
    return Promise.resolve(Response.json(applicationAccessResponse()));
  }
  if (path.endsWith("/sporting-search-options")) {
    return Promise.resolve(
      Response.json({
        resourceType: new URL(url).searchParams.get("resourceType"),
        seasons: [season],
        divisions: [],
        formats: ["6x6", "4x4", "2x2"],
        genders: ["female", "male", "mixed"],
      }),
    );
  }
  if (path.endsWith("/clubs")) {
    return Promise.resolve(
      Response.json({
        clubs: [
          { club: { id: firstId, name: "Volley" }, city: "Lyon" },
          { club: { id: secondId, name: "Volley" }, city: "Niort" },
        ],
      }),
    );
  }
  if (path.endsWith("/teams")) {
    return Promise.resolve(
      Response.json({
        teams: [
          {
            team: { id: firstId, name: "Volley professionnel" },
            season,
            classification: { format: "6x6", gender: "female" },
            professional: true,
          },
        ],
      }),
    );
  }
  if (path.endsWith("/pools")) {
    return Promise.resolve(
      Response.json({
        pools: [
          {
            pool: { id: firstId, name: "Poule A" },
            season,
            classification: {},
            competitionName: "Championnat public",
            phaseName: "Phase finale",
          },
        ],
      }),
    );
  }
  throw new Error(`Unexpected controlled request ${path}`);
}

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
  jest.useFakeTimers();
  mockIsFocused.mockReset().mockReturnValue(true);
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
  // Await pending native/Query batches before restoring the test's real timer environment.
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...environment };
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
});

/** Supplies the actual required owners; membership changes presentation only. */
function SearchOwners({
  children,
  proAccent = false,
}: Readonly<PropsWithChildren<{ proAccent?: boolean }>>) {
  return (
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
                    <AdvertisingProviders>
                      <SearchVisitProvider>{children}</SearchVisitProvider>
                    </AdvertisingProviders>
                  </AccountFeedbackProvider>
                </PrivateQueries>
              </AccountSessionProvider>
            </ApplicationAccessProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Keeps screen scenarios under the same query, session and native presentation owners. */
async function renderSearch(proAccent = false) {
  const result = await render(<SearchScreen />, {
    wrapper: ({ children }) => (
      <SearchOwners proAccent={proAccent}>{children}</SearchOwners>
    ),
  });
  await layoutNativeTabs();
  return result;
}

it.each(["success", "failure"])(
  "leaves an inactive Clubs search unread and retains its %s outcome on return",
  async (outcome) => {
    // Given: native paging can mount a neighbour before it becomes the selected tab.
    mockFetch.mockImplementation((url: string) =>
      outcome === "failure" && new URL(url).pathname.endsWith("/clubs")
        ? Promise.resolve(Response.json({ status: 503 }, { status: 503 }))
        : publicReads(url),
    );
    const { result, rerender } = await renderHook(
      ({ active }: { active: boolean }) => {
        const query = useDiscoveryQuery("club", { q: "Volley" }, active);
        return {
          data: query.data,
          isError: query.isError,
          isFetched: query.isFetched,
          status: useAccountSession().status,
        };
      },
      { initialProps: { active: false }, wrapper: SearchOwners },
    );
    await waitFor(() => expect(result.current.status).toBe("guest"));

    // Then: mounting the scene neither executes its search nor creates accepted data.
    expect(result.current.data).toBeUndefined();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(String(url)).pathname.endsWith("/clubs"),
      ),
    ).toHaveLength(0);

    // When
    await rerender({ active: true });
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    await rerender({ active: false });
    mockFetch.mockClear();
    await act(async () => {
      await client.refetchQueries({
        predicate: ({ queryKey }) =>
          ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
        type: "active",
      });
    });
    expect(mockFetch).not.toHaveBeenCalled();
    await rerender({ active: true });
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then: selecting the same context preserves its result or explicit recovery without another GET.
    expect(mockFetch).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(result.current.isError).toBe(outcome === "failure"),
    );
    expect(result.current.data !== undefined).toBe(outcome === "success");
  },
);

it.each(["guest", "free", "Pro", "unresolved"])(
  "allows all three public tabs for %s without waiting for Pro",
  async (access) => {
    // Given: no RevenueCat dependency is mounted; unresolved native restoration must not block public reads.
    const restoration = Promise.withResolvers<boolean>();
    if (access === "unresolved") {
      mockAuth0.hasValidCredentials.mockReturnValue(restoration.promise);
    } else {
      mockAuth0.hasValidCredentials.mockResolvedValue(access !== "guest");
    }
    const user = userEvent.setup();
    try {
      await renderSearch(access === "Pro");

      // When
      await user.type(await screen.findByLabelText("Rechercher"), "Volley");
      await user.press(screen.getByRole("tab", { name: "Clubs" }));
      await screen.findByText("Lyon");
      await user.press(screen.getByRole("tab", { name: "Poules" }));
      await screen.findByText("Championnat public · Phase finale");
      await user.press(screen.getByRole("tab", { name: "Équipes" }));

      // Then
      expect(await screen.findByText("Volley professionnel")).toBeOnTheScreen();
      expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
      expect(
        screen.getByRole("tab", { name: "Équipes", selected: true }),
      ).toBeOnTheScreen();
      expect(
        mockFetch.mock.calls
          .filter(([url]) => /\/(clubs|teams|pools)\?/.test(String(url)))
          .every(
            ([, options]) => !new Headers(options.headers).has("Authorization"),
          ),
      ).toBe(true);
    } finally {
      await cleanup();
      await act(async () => restoration.resolve(false));
    }
  },
);

it("keeps distinct namesakes and presents only available public context without logo reads", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await user.type(await screen.findByLabelText("Rechercher"), "Volley");

  // When
  await user.press(screen.getByRole("tab", { name: "Clubs" }));

  // Then
  expect(await screen.findAllByText("Volley")).toHaveLength(2);
  expect(screen.getByText("Lyon")).toBeOnTheScreen();
  expect(screen.getByText("Niort")).toBeOnTheScreen();
  // When
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  // Then
  expect(await screen.findByText("Volley professionnel")).toBeOnTheScreen();
  expect(screen.getByText("2026/2027")).toBeOnTheScreen();
  expect(screen.getByText("Féminin")).toBeOnTheScreen();
  expect(screen.getByText("6 × 6")).toBeOnTheScreen();
  expect(
    screen.getByRole("image", { name: "Logo absent : Volley professionnel" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText(/Club inconnu|Sans club|Logo indisponible/),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/logo")),
  ).toBe(false);
});

it("selects the search resource through native page settlement and retains its shared text on return", async () => {
  // Given: only the current scene has performed a textual search.
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Volley professionnel");
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/clubs?")),
  ).toBe(false);

  // When: the native pager settles on Clubs without a tab-bar press.
  await fireEvent(screen.getByTestId("native-tabs-pager"), "pageSelected", {
    nativeEvent: { position: 2 },
  });
  await fireEvent(screen.getByTestId("native-tabs-pager"), "pageScroll", {
    nativeEvent: { position: 2, offset: 0 },
  });
  await fireEvent(
    screen.getByTestId("native-tabs-pager"),
    "pageScrollStateChanged",
    {
      nativeEvent: { pageScrollState: "idle" },
    },
  );

  // Then: business selection, accessible content and the common input agree with that page.
  expect(await screen.findByText("Niort")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "2 résultats chargés" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Clubs", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByPlaceholderText("Rechercher un club…")).toHaveDisplayValue(
    "Volley",
  );
  expect(screen.queryByText("Volley professionnel")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Filtres" }),
  ).not.toBeOnTheScreen();
  mockFetch.mockClear();

  // When
  await fireEvent(screen.getByTestId("native-tabs-pager"), "pageSelected", {
    nativeEvent: { position: 0 },
  });
  await fireEvent(screen.getByTestId("native-tabs-pager"), "pageScroll", {
    nativeEvent: { position: 0, offset: 0 },
  });
  await fireEvent(
    screen.getByTestId("native-tabs-pager"),
    "pageScrollStateChanged",
    {
      nativeEvent: { pageScrollState: "idle" },
    },
  );

  // Then: the visited result and controls remain coherent through ordinary native rereading.
  expect(await screen.findByText("Volley professionnel")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "1 résultat chargé" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Équipes", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Filtres" })).toBeOnTheScreen();
  expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue("Volley");
  expect(
    mockFetch.mock.calls.every(([url]) =>
      new URL(String(url)).pathname.endsWith("/teams"),
    ),
  ).toBe(true);
});

it("reads changed text only for the selected resource and preserves equivalent normalized criteria", async () => {
  // Given: all three scene contexts exist, with their accepted result pages.
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Volley professionnel");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Niort");
  await user.press(screen.getByRole("tab", { name: "Poules" }));
  await screen.findByText("Championnat public · Phase finale");
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByText("Volley professionnel");
  mockFetch.mockClear();
  // Equivalent normalized criteria retain the accepted scenes without another read.
  await fireEvent.changeText(screen.getByLabelText("Rechercher"), "VOLLEY");
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.getByText("Volley professionnel")).toBeOnTheScreen();

  // When: the common RHF text changes while Teams is selected.
  await fireEvent.changeText(screen.getByLabelText("Rechercher"), "Nouveau");
  await screen.findByText("Volley professionnel");

  // Then: retained neighbour contexts perform no read for that new text.
  const reads = mockFetch.mock.calls
    .map(([url]) => new URL(String(url)))
    .filter((url) => /\/(clubs|teams|pools)$/.test(url.pathname));
  expect(reads).toHaveLength(1);
  expect(reads[0].pathname).toBe("/teams");
  expect(reads[0].searchParams.get("q")).toBe("Nouveau");
  expect(
    screen.getByRole("header", { name: "1 résultat chargé" }),
  ).toBeOnTheScreen();

  // When: the user returns to earlier criteria while Teams stays selected.
  mockFetch.mockClear();
  await fireEvent.changeText(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Volley professionnel");

  // Then: returning reuses this valid text context; native position is qualified separately.
  expect(mockFetch).not.toHaveBeenCalled();
});

it("clears the shared query and opens examples for the selected tab", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await screen.findByText("Volley professionnel");
  mockFetch.mockClear();

  // When
  await user.press(
    screen.getByRole("button", { name: "Effacer la recherche" }),
  );
  await user.press(screen.getByRole("tab", { name: "Clubs" }));

  // Then
  expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue("");
  expect(
    screen.queryByRole("button", { name: "Effacer la recherche" }),
  ).not.toBeOnTheScreen();
  expect(await screen.findByText("Niort")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([url]) => !new URL(url).searchParams.has("q")),
  ).toBe(true);
  expect(screen.getByRole("header", { name: "Exemples" })).toBeOnTheScreen();
  expect(screen.queryByText("Volley professionnel")).not.toBeOnTheScreen();
});

it("accepts 200 Unicode code points and rejects longer input without truncation, counter or limit hint", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  const input = await screen.findByLabelText("Rechercher");
  const accepted = "🏐".repeat(200);

  // When
  await user.paste(input, accepted);
  await screen.findByText("Volley professionnel");

  // Then
  expect(screen.getByDisplayValue(accepted)).toBeOnTheScreen();
  expect(screen.queryByText(/200|caractères/)).not.toBeOnTheScreen();
  expect(screen.queryByHintText(/200|caractères/)).not.toBeOnTheScreen();
  mockFetch.mockClear();
  // When
  await user.paste(input, accepted + "🏐");
  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "La recherche est limitée à 200 caractères.",
  );
  expect(screen.getByDisplayValue(accepted + "🏐")).toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.queryByText("Volley professionnel")).not.toBeOnTheScreen();
});

it("distinguishes initial waiting, retryable failure and established no matches while retaining text", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) =>
    url.includes("/teams?") ? pending.promise : publicReads(url),
  );
  const user = userEvent.setup();
  await renderSearch();

  // When
  await user.type(await screen.findByLabelText("Rechercher"), "Volley");

  // Then
  expect(
    await screen.findByRole("progressbar", {
      name: "Chargement des résultats",
      busy: true,
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Aucun résultat pour ces critères"),
  ).not.toBeOnTheScreen();
  // When
  await act(async () => pending.reject(new TypeError("private diagnostic")));
  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Une erreur est survenue",
  );
  expect(screen.getByText("Veuillez réessayer plus tard.")).toBeOnTheScreen();
  expect(
    screen.queryByText(/recherche est indisponible/),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText("private diagnostic")).not.toBeOnTheScreen();
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
  mockFetch.mockImplementation((url: string) =>
    url.includes("/teams?")
      ? Promise.resolve(Response.json({ teams: [] }))
      : publicReads(url),
  );
  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  // Then
  expect(
    await screen.findByText("Aucun résultat pour ces critères"),
  ).toBeOnTheScreen();
});

it("clears empty search criteria from the card and keeps its focus action free of reads", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.resolve(Response.json({ clubs: [] }))
      : publicReads(url),
  );
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(
    await screen.findByPlaceholderText("Rechercher un club…"),
    "Volley",
  );
  await screen.findByRole("button", { name: "Effacer les critères" });

  // When
  await user.press(
    screen.getByRole("button", { name: "Effacer les critères" }),
  );

  // Then
  expect(screen.getByPlaceholderText("Rechercher un club…")).toHaveDisplayValue(
    "",
  );
  expect(
    screen.getByRole("tab", { name: "Clubs", selected: true }),
  ).toBeOnTheScreen();
  expect(
    await screen.findByRole("button", { name: "Rechercher" }),
  ).toBeEnabled();
  expect(screen.getByText("Aucun exemple disponible")).toBeOnTheScreen();
  expect(
    screen.getByText("Saisissez un nom pour lancer une recherche."),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Essayez un autre nom.")).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

  // When: the existing RHF input ref owns focus; this action must not start a query.
  mockFetch.mockClear();
  await user.press(screen.getByRole("button", { name: "Rechercher" }));

  // Then
  expect(mockFetch).not.toHaveBeenCalled();
});

it("keeps common search clearing available while masking failed Clubs controls", async () => {
  // Given: replacement text is pasted directly, without unmounting results through an empty draft.
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/clubs")) {
      if (parsed.searchParams.get("q") === "None") {
        return pending.promise;
      }
      if (parsed.searchParams.get("q") === "Failed") {
        return Promise.resolve(
          Response.json({ title: "Unavailable", status: 503 }, { status: 503 }),
        );
      }
    }
    return publicReads(url);
  });
  const user = userEvent.setup();
  await renderSearch();
  const input = await screen.findByLabelText("Rechercher");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.paste(input, "Volley");
  await screen.findByRole("header", { name: "2 résultats chargés" });
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();

  // When
  await user.paste(input, "None");

  // Then: a new pending/error read has no accepted count, while successful emptiness has zero.
  expect(
    await screen.findByRole("header", { name: "Résultats" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Effacer" })).toBeEnabled();
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText("Lyon")).not.toBeOnTheScreen();
  // When
  await act(async () => pending.resolve(Response.json({ clubs: [] })));
  // Then
  expect(
    await screen.findByRole("header", { name: "0 résultats chargés" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByText("Aucun résultat pour ces critères"),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Effacer" })).toBeEnabled();
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();
  // When
  await user.paste(input, "Failed");
  // Then
  await screen.findByRole("button", { name: "Réessayer" });
  expect(screen.queryByRole("header", { name: "Résultats" })).toBeNull();
  expect(screen.queryByRole("button", { name: /^Effacer$/ })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Effacer la recherche" }),
  ).toBeEnabled();
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();
  mockFetch.mockImplementation(publicReads);
  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  // Then
  await screen.findByRole("header", { name: "2 résultats chargés" });
  mockFetch.mockClear();
  // When
  await user.press(screen.getByRole("button", { name: "Effacer" }));
  // Then
  expect(input).toHaveDisplayValue("");
  expect(
    screen.getByRole("tab", { name: "Clubs", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Exemples" })).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Effacer" }),
  ).not.toBeOnTheScreen();
  expect(new URL(mockFetch.mock.calls.at(-1)?.[0]).search).toBe("");
});

it("cancels superseded text and tab requests and never shows an older result as the new search", async () => {
  // Given: a transport that completes late even after cancellation.
  const old = Promise.withResolvers<Response>();
  let signal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, options: RequestInit) => {
    if (
      url.includes("/teams?") &&
      new URL(url).searchParams.get("q") === "Old"
    ) {
      signal = options.signal ?? undefined;
      return old.promise;
    }
    return publicReads(url);
  });
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Old");
  await waitFor(() => expect(signal).toBeDefined());

  // When
  await user.clear(screen.getByLabelText("Rechercher"));
  await user.type(screen.getByLabelText("Rechercher"), "Volley");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await act(async () =>
    old.resolve(
      Response.json({
        teams: [
          {
            team: { id: firstId, name: "Obsolete" },
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
  expect(await screen.findByText("Niort")).toBeOnTheScreen();
  expect(screen.queryByText("Obsolete")).not.toBeOnTheScreen();
});

it("keeps failure and criteria honest during native focus/reconnect/return rereads", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    url.includes("/teams?")
      ? Promise.reject(new TypeError("offline"))
      : publicReads(url),
  );
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await screen.findByRole("alert");
  expect(screen.queryByRole("header", { name: "Résultats" })).toBeNull();
  mockFetch.mockClear();

  // When
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Niort");
  expect(
    screen.getByRole("header", { name: "2 résultats chargés" }),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
  });

  // Then
  await waitFor(() => expect(screen.getByRole("alert")).toBeOnTheScreen());
  expect(screen.queryByRole("header", { name: "Résultats" })).toBeNull();
  expect(
    screen.queryByRole("header", { name: "2 résultats chargés" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/teams?")),
  ).toHaveLength(0);
});

it("treats empty and whitespace-only text as the same example context", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();

  // When
  await user.paste(await screen.findByLabelText("Rechercher"), "\u2003  ");

  // Then
  expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue("\u2003  ");
  expect(
    mockFetch.mock.calls.some(([url]) =>
      /\/(clubs|teams|pools)(\?|$)/.test(String(url)),
    ),
  ).toBe(true);
  expect(screen.getByRole("header", { name: "Exemples" })).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

it.each(["empty", "error"])(
  "retains the draft and selected tab when an %s search is read again",
  async (state) => {
    // Given
    const user = userEvent.setup();
    mockFetch.mockImplementation((url: string) => {
      if (!new URL(url).pathname.endsWith("/clubs")) {
        return publicReads(url);
      }
      const response =
        state === "empty"
          ? Response.json({ clubs: [] })
          : Response.json(
              { title: "Unavailable", status: 503 },
              { status: 503 },
            );
      return Promise.resolve(response);
    });
    await renderSearch();
    await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    if (state === "empty") {
      await screen.findByText("Aucun résultat pour ces critères");
    } else {
      await screen.findByRole("button", { name: "Réessayer" });
    }
    mockFetch.mockReset().mockImplementation(publicReads);

    // When
    if (state === "error") {
      await user.press(screen.getByRole("button", { name: "Réessayer" }));
    } else {
      await act(async () => {
        await client.refetchQueries({
          predicate: ({ queryKey }) =>
            ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
          type: "active",
        });
      });
    }

    // Then
    expect(await screen.findByText("Lyon")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
    expect(
      screen.getByRole("tab", { name: "Clubs", selected: true }),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.every(([url]) =>
        new URL(String(url)).pathname.endsWith("/clubs"),
      ),
    ).toBe(true);
  },
);

it("does not append from an inactive resource or covered Search route", async () => {
  // Given: The native pager retains the club scene after selecting another resource.
  const user = userEvent.setup();
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/clubs")) {
      return publicReads(url);
    }
    if (parsed.searchParams.has("cursor")) {
      return pending.promise;
    }
    return Promise.resolve(
      Response.json({
        clubs: [{ club: { id: firstId, name: "Volley Lyon" }, city: "Lyon" }],
        nextCursor: "next-page",
      }),
    );
  });
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Volley Lyon");
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByText("Volley professionnel");
  mockFetch.mockClear();

  // When: layout may reach the end of an inactive retained scene.
  await fireEvent(
    screen.getByText("Volley Lyon", { includeHiddenElements: true }),
    "endReached",
    { distanceFromEnd: 0 },
  );

  // Then: it cannot advance that query while another resource is selected.
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).searchParams.has("cursor"),
    ),
  ).toHaveLength(0);

  // When: Router retains Search beneath another main tab or a filter sheet.
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  mockIsFocused.mockReturnValue(false);
  await fireEvent(await screen.findByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });

  // Then: internal tab selection does not authorize a hidden route's continuation.
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).searchParams.has("cursor"),
    ),
  ).toHaveLength(0);
});

it("shares one pending cursor read across repeated native end events", async () => {
  // Given: The native pager retains the club scene after selecting another resource.
  const user = userEvent.setup();
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/clubs")) {
      return publicReads(url);
    }
    if (parsed.searchParams.has("cursor")) {
      return pending.promise;
    }
    return Promise.resolve(
      Response.json({
        clubs: [{ club: { id: firstId, name: "Volley Lyon" }, city: "Lyon" }],
        nextCursor: "next-page",
      }),
    );
  });
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Volley Lyon");
  // When: the focused scene reaches its end twice while its page is pending.
  mockIsFocused.mockReturnValue(true);
  await fireEvent(screen.getByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });
  expect(
    await screen.findByRole("progressbar", {
      name: "Chargement de la suite…",
      busy: true,
    }),
  ).toBeOnTheScreen();
  await fireEvent(screen.getByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });
  await act(async () => {
    pending.resolve(
      Response.json({
        clubs: [
          { club: { id: secondId, name: "Volley Niort" }, city: "Niort" },
        ],
      }),
    );
  });

  // Then: TanStack Query admits one continuation, retaining the first page and shared draft.
  expect(await screen.findByText("Volley Niort")).toBeOnTheScreen();
  expect(screen.getByText("Volley Lyon")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
  const continuation = mockFetch.mock.calls.filter(([url]) =>
    new URL(String(url)).searchParams.has("cursor"),
  );
  expect(continuation).toHaveLength(1);
  expect(new URL(String(continuation[0][0])).searchParams.get("cursor")).toBe(
    "next-page",
  );
  expect(screen.queryByRole("button", { name: "Charger la suite" })).toBeNull();
});

it.each([
  { state: "pending retry", failBeforeReturn: false },
  { state: "settled repeat failure", failBeforeReturn: true },
])(
  "returns to a failed Clubs continuation after $state and retries only its cursor",
  async ({ failBeforeReturn }) => {
    // Given
    const user = userEvent.setup();
    let retry = Promise.withResolvers<Response>();
    const first = { club: { id: firstId, name: "Volley Lyon" }, city: "Lyon" };
    let nextPageAvailable = false;
    mockFetch.mockImplementation((url: string) => {
      const parsed = new URL(url);
      if (!parsed.pathname.endsWith("/clubs")) {
        return publicReads(url);
      }
      if (!parsed.searchParams.has("cursor")) {
        return Promise.resolve(
          Response.json({ clubs: [first], nextCursor: "next-page" }),
        );
      }
      return nextPageAvailable
        ? retry.promise
        : Promise.resolve(
            Response.json(
              { title: "Unavailable", status: 500 },
              { status: 500 },
            ),
          );
    });
    await renderSearch();
    await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    await fireEvent(await screen.findByText("Volley Lyon"), "endReached", {
      distanceFromEnd: 0,
    });
    const list = screen.getByLabelText("Résultats de recherche");
    await screen.findByText("Une erreur est survenue.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Volley Lyon")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "1 résultat chargé" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Effacer$/ })).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Effacer la recherche" }),
    ).toBeOnTheScreen();
    expect(
      client.getQueryData(
        createDiscoveryContext("club", { q: "Volley" }).queryKey,
      ),
    ).toEqual({
      pages: [{ clubs: [first], nextCursor: "next-page" }],
      pageParams: [undefined],
    });
    expect(
      screen.queryByLabelText("Actualiser les données"),
    ).not.toBeOnTheScreen();
    nextPageAvailable = true;
    mockFetch.mockClear();

    // When
    await user.press(
      screen.getByRole("button", {
        name: "Réessayer",
      }),
    );

    // Then: explicit Retry preserves the same native list and shows continuation progress.
    expect(screen.getByLabelText("Résultats de recherche")).toBe(list);
    expect(screen.getByText("Volley Lyon")).toBeOnTheScreen();
    expect(
      screen.getByRole("progressbar", { name: "Chargement de la suite…" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();

    // When: an unrelated tab remains usable and returning joins the same read.
    await user.press(screen.getByRole("tab", { name: "Équipes" }));
    expect(await screen.findByText("Volley professionnel")).toBeOnTheScreen();
    if (failBeforeReturn) {
      await act(async () => retry.resolve(Response.json({}, { status: 503 })));
      await waitFor(() =>
        expect(
          client.getQueryState(
            createDiscoveryContext("club", { q: "Volley" }).queryKey,
          )?.fetchStatus,
        ).toBe("idle"),
      );
      retry = Promise.withResolvers<Response>();
      mockFetch.mockClear();
    }
    await user.press(screen.getByRole("tab", { name: "Clubs" }));

    // Then: returning does not turn the failed cursor into a new traversal.
    expect(screen.getByLabelText("Résultats de recherche")).toBe(list);
    expect(screen.getByText("Volley Lyon")).toBeOnTheScreen();
    if (failBeforeReturn) {
      expect(mockFetch).not.toHaveBeenCalled();

      // When: another explicit attempt still requests only the continuation.
      await user.press(screen.getByRole("button", { name: "Réessayer" }));
      expect(
        screen.getByRole("progressbar", { name: "Chargement de la suite…" }),
      ).toBeOnTheScreen();
    }

    // When
    await act(async () => {
      retry.resolve(
        Response.json({
          clubs: [
            first,
            { club: { id: secondId, name: "Volley Niort" }, city: "Niort" },
          ],
        }),
      );
    });

    // Then
    expect(await screen.findByText("Volley Niort")).toBeOnTheScreen();
    expect(screen.getAllByText("Volley Lyon")).toHaveLength(1);
    expect(
      screen.getByRole("header", { name: "2 résultats chargés" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Charger la suite" }),
    ).not.toBeOnTheScreen();
    await fireEvent(screen.getByText("Volley Niort"), "endReached", {
      distanceFromEnd: 0,
    });
    const clubReads = mockFetch.mock.calls
      .map(([url]) => new URL(String(url)))
      .filter((url) => url.pathname.endsWith("/clubs"));
    expect(clubReads.map((url) => url.searchParams.get("cursor"))).toEqual([
      "next-page",
    ]);
  },
);

it.each(["content", "empty", "error"] as const)(
  "keeps an initial Clubs error card through its explicit read before %s",
  async (outcome) => {
    // Given: the initial failure has no accepted page; Query and HTTP validation stay real.
    let pending: Promise<Response> | undefined;
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/clubs")
        ? (pending ?? Promise.reject(new TypeError("Controlled outage")))
        : publicReads(url),
    );
    const user = userEvent.setup();
    await renderSearch();
    await user.paste(screen.getByLabelText("Rechercher"), "Volley");
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    const card = await screen.findByRole("alert");
    const retry = Promise.withResolvers<Response>();
    pending = retry.promise;

    // When
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(card).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: true }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("progressbar", { name: "Chargement des résultats" }),
    ).toBeNull();
    expect(screen.queryByRole("header", { name: "Résultats" })).toBeNull();
    expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();

    // When
    await act(async () => {
      retry.resolve(
        outcome === "error"
          ? Response.json({}, { status: 503 })
          : outcome === "empty"
            ? Response.json({ clubs: [] })
            : await publicReads("https://api.example.invalid/clubs?q=Volley"),
      );
    });

    // Then
    if (outcome === "error") {
      expect(card).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Réessayer", busy: false }),
      ).toBeEnabled();
    } else if (outcome === "empty") {
      expect(
        await screen.findByText("Aucun résultat pour ces critères"),
      ).toBeOnTheScreen();
      expect(screen.queryByRole("alert")).toBeNull();
    } else {
      expect(await screen.findByText("Niort")).toBeOnTheScreen();
      expect(screen.queryByRole("alert")).toBeNull();
    }
  },
);

it.each(["content", "empty", "error"] as const)(
  "keeps the settled Clubs %s outcome on tab return without another read",
  async (outcome) => {
    // Given: explicit Retry remains observed while another search resource is selected.
    const retry = Promise.withResolvers<Response>();
    let read: Promise<Response> = Promise.resolve(
      Response.json({}, { status: 503 }),
    );
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/clubs") ? read : publicReads(url),
    );
    const user = userEvent.setup();
    await renderSearch();
    await user.paste(screen.getByLabelText("Rechercher"), "Volley");
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    await screen.findByRole("alert");
    read = retry.promise;
    mockFetch.mockClear();
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await user.press(screen.getByRole("tab", { name: "Équipes" }));
    await screen.findByText("Volley professionnel");
    await act(async () => {
      retry.resolve(
        outcome === "error"
          ? Response.json({}, { status: 503 })
          : outcome === "empty"
            ? Response.json({ clubs: [] })
            : await publicReads("https://api.example.invalid/clubs?q=Volley"),
      );
    });
    const queryKey = createDiscoveryContext("club", { q: "Volley" }).queryKey;
    await waitFor(() =>
      expect(client.getQueryState(queryKey)?.fetchStatus).toBe("idle"),
    );
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(String(url)).pathname.endsWith("/clubs"),
      ),
    ).toHaveLength(1);
    mockFetch.mockClear();

    // When: returning selects the same retained query context.
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    expect(client.getQueryState(queryKey)?.fetchStatus).toBe("idle");

    // Then: the completed operation keeps its outcome and the action is no longer busy.
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
    if (outcome === "error") {
      expect(screen.getByRole("alert")).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Réessayer", busy: false }),
      ).toBeEnabled();
    } else if (outcome === "empty") {
      expect(
        screen.getByText("Aucun résultat pour ces critères"),
      ).toBeOnTheScreen();
      expect(screen.queryByRole("alert")).toBeNull();
    } else {
      expect(screen.getByText("Niort")).toBeOnTheScreen();
      expect(
        screen.getByRole("header", { name: "2 résultats chargés" }),
      ).toBeOnTheScreen();
      expect(screen.queryByRole("alert")).toBeNull();
    }
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(String(url)).pathname.endsWith("/clubs"),
      ),
    ).toHaveLength(0);
  },
);

it("keeps a suspended Clubs card retry without active progress and resumes the same read", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs")
      ? Promise.reject(new TypeError("Controlled outage"))
      : publicReads(url),
  );
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  const card = await screen.findByRole("alert");
  const retry = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/clubs") ? retry.promise : publicReads(url),
  );
  await act(async () => onlineManager.setOnline(false));
  mockFetch.mockClear();

  // When: repeated explicit requests join the existing paused Query attempt.
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(card).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Réessayer", busy: false }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(mockFetch).not.toHaveBeenCalled();

  // When
  await act(async () => onlineManager.setOnline(true));

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer", busy: true }),
  ).toBeDisabled();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.endsWith("/clubs"),
    ),
  ).toHaveLength(1);
  await act(async () =>
    retry.resolve(
      await publicReads("https://api.example.invalid/clubs?q=Volley"),
    ),
  );
  expect(await screen.findByText("Niort")).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("cancels a continuation retry when the shared text changes and ignores its old cursor response", async () => {
  // Given
  const old = Promise.withResolvers<Response>();
  let retryAvailable = false;
  let oldSignal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, options: RequestInit) => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/clubs")) {
      return publicReads(url);
    }
    if (parsed.searchParams.get("q") === "Nouveau") {
      return Promise.resolve(
        Response.json({
          clubs: [{ club: { id: secondId, name: "Nouveau club" } }],
        }),
      );
    }
    if (parsed.searchParams.has("cursor")) {
      if (retryAvailable) {
        oldSignal = options.signal ?? undefined;
        return old.promise;
      }
      return Promise.resolve(Response.json({}, { status: 503 }));
    }
    return Promise.resolve(
      Response.json({
        clubs: [{ club: { id: firstId, name: "Volley Lyon" } }],
        nextCursor: "next-page",
      }),
    );
  });
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await fireEvent(await screen.findByText("Volley Lyon"), "endReached");
  await screen.findByText("Une erreur est survenue.");
  retryAvailable = true;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await waitFor(() => expect(oldSignal).toBeDefined());

  // When
  await user.paste(screen.getByLabelText("Rechercher"), "Nouveau");
  await screen.findByText("Nouveau club");
  await act(async () =>
    old.resolve(
      Response.json({
        clubs: [{ club: { id: firstId, name: "Obsolete club" } }],
      }),
    ),
  );

  // Then
  expect(oldSignal?.aborted).toBe(true);
  expect(screen.getByText("Nouveau club")).toBeOnTheScreen();
  expect(screen.queryByText("Obsolete club")).not.toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByDisplayValue("Nouveau")).toBeOnTheScreen();
});

it("ends an inactive Clubs retry with its bypass context before ordinary public admission", async () => {
  // Given: the real admission owner records a current account's explicit bypass.
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const account = accountResponse();
  account.permissions.bypassMaintenance = true;
  const complete = applicationAccessResponse();
  complete.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  const response = Promise.withResolvers<Response>();
  let retryAvailable = false;
  let signal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, options: RequestInit) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/application-access")) {
      return Promise.resolve(Response.json(complete));
    }
    if (parsed.pathname.endsWith("/accounts/me")) {
      return Promise.resolve(Response.json(account));
    }
    if (
      parsed.pathname.endsWith("/clubs") &&
      parsed.searchParams.get("q") === "Volley"
    ) {
      if (parsed.searchParams.has("cursor")) {
        if (retryAvailable) {
          signal = options.signal ?? undefined;
          return response.promise;
        }
        return Promise.resolve(Response.json({}, { status: 500 }));
      }
      return Promise.resolve(
        Response.json({
          clubs: [
            {
              club: {
                id: firstId,
                name: complete.maintenance.active
                  ? "Club en bypass"
                  : "Club public actuel",
              },
            },
          ],
          nextCursor: "next-page",
        }),
      );
    }
    return publicReads(url);
  });
  const user = userEvent.setup();
  const { result } = await renderHook(() => useAccessAdmission(), {
    wrapper: ({ children }) => (
      <SearchOwners>
        <AccessAdmissionProvider>
          {children}
          <SearchScreen />
        </AccessAdmissionProvider>
      </SearchOwners>
    ),
  });
  await layoutNativeTabs();
  await waitFor(() => expect(result.current.canBypass).toBe(true));
  await act(() => {
    expect(result.current.bypassMaintenance()).toBe(true);
  });
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await fireEvent(await screen.findByText("Club en bypass"), "endReached");
  await screen.findByText("Une erreur est survenue.");
  retryAvailable = true;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await waitFor(() => expect(signal).toBeDefined());
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByText("Volley professionnel");
  mockFetch.mockClear();

  // When: maintenance ends without changing the actor or removing ordinary routes.
  complete.maintenance = {
    revision: 2,
    active: false,
    message: null,
    imageUrl: null,
  };
  await act(async () => {
    await result.current.retry();
  });
  await waitFor(() => expect(result.current.bypass).toBeUndefined());

  // Then: the original attempt is canceled; inactive Clubs cannot read another admission context.
  expect(signal?.aborted).toBe(true);
  expect(result.current.ordinary).toBe(true);
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.endsWith("/clubs"),
    ),
  ).toHaveLength(0);
  await act(() =>
    response.resolve(
      Response.json({
        clubs: [{ club: { id: secondId, name: "Ancien résultat bypass" } }],
      }),
    ),
  );
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Équipes", selected: true }),
  ).toBeOnTheScreen();

  // When: only explicit tab selection admits the new public query.
  await user.press(screen.getByRole("tab", { name: "Clubs" }));

  // Then
  expect(await screen.findByText("Club public actuel")).toBeOnTheScreen();
  expect(screen.queryByText("Ancien résultat bypass")).not.toBeOnTheScreen();
  expect(screen.queryByText("Club en bypass")).not.toBeOnTheScreen();
  const clubs = mockFetch.mock.calls.filter(([url]) =>
    new URL(String(url)).pathname.endsWith("/clubs"),
  );
  expect(clubs).toHaveLength(1);
  expect(new Headers(clubs[0][1].headers).has("Authorization")).toBe(false);
  expect(
    new Headers(clubs[0][1].headers).has("Blockout-Maintenance-Bypass"),
  ).toBe(false);
});

it.each([false, true])(
  "keeps accepted pages in Query behind a failed Clubs background read and accepts the next traversal: %s",
  async (fails) => {
    // Given
    const user = userEvent.setup();
    mockFetch.mockImplementation((url: string) => {
      const parsed = new URL(url);
      if (!parsed.pathname.endsWith("/clubs")) {
        return publicReads(url);
      }
      return Promise.resolve(
        Response.json(
          parsed.searchParams.has("cursor")
            ? {
                clubs: [
                  {
                    club: { id: secondId, name: "Volley Niort" },
                    city: "Niort",
                  },
                ],
              }
            : {
                clubs: [
                  { club: { id: firstId, name: "Volley Lyon" }, city: "Lyon" },
                ],
                nextCursor: "next-page",
              },
        ),
      );
    });
    await renderSearch();
    await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    await fireEvent(await screen.findByText("Volley Lyon"), "endReached", {
      distanceFromEnd: 0,
    });
    await screen.findByText("Volley Niort");
    mockFetch.mockClear();
    mockFetch.mockImplementation((url: string) => {
      if (fails) {
        return Promise.resolve(
          Response.json({ title: "Unavailable", status: 500 }, { status: 500 }),
        );
      }
      const body = new URL(url).searchParams.has("cursor")
        ? { clubs: [] }
        : {
            clubs: [
              {
                club: { id: firstId, name: "Volley Lyon actualisé" },
                city: "Lyon",
              },
            ],
            nextCursor: "new-page",
          };
      return Promise.resolve(Response.json(body));
    });

    // When
    await act(async () => {
      await client.invalidateQueries({
        queryKey: createDiscoveryContext("club", { q: "Volley" }).queryKey,
        exact: true,
      });
    });
    if (fails) {
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Une erreur est survenue",
      );
      expect(screen.queryByText("Volley Lyon")).not.toBeOnTheScreen();
      expect(screen.queryByText("Volley Niort")).not.toBeOnTheScreen();
      expect(
        screen.queryByRole("header", { name: "2 résultats chargés" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: "Réessayer", busy: false }),
      ).toBeEnabled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      mockFetch.mockClear();
      mockFetch.mockImplementation((url: string) =>
        Promise.resolve(
          Response.json(
            new URL(url).searchParams.has("cursor")
              ? { clubs: [] }
              : {
                  clubs: [
                    {
                      club: { id: firstId, name: "Volley Lyon actualisé" },
                      city: "Lyon",
                    },
                  ],
                  nextCursor: "new-page",
                },
          ),
        ),
      );
      // When: the final background failure is recovered only by an explicit safe read.
      await user.press(screen.getByRole("button", { name: "Réessayer" }));
    }

    // Then
    expect(await screen.findByText("Volley Lyon actualisé")).toBeOnTheScreen();
    expect(screen.queryByText("Volley Niort")).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(
      mockFetch.mock.calls.map(([url]) =>
        new URL(String(url)).searchParams.get("cursor"),
      ),
    ).toEqual([null, "new-page"]);
    expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
    expect(
      screen.getByRole("tab", { name: "Clubs", selected: true }),
    ).toBeOnTheScreen();
  },
);

it("cancels pending pagination before a background read and rejects its late response", async () => {
  // Given
  const user = userEvent.setup();
  const pending = Promise.withResolvers<Response>();
  let pageSignal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/clubs")) {
      return publicReads(url);
    }
    if (parsed.searchParams.has("cursor")) {
      pageSignal = options?.signal ?? undefined;
      return pending.promise;
    }
    return Promise.resolve(
      Response.json({
        clubs: [{ club: { id: firstId, name: "Volley Lyon" }, city: "Lyon" }],
        nextCursor: "next-page",
      }),
    );
  });
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await fireEvent(await screen.findByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });
  await waitFor(() => expect(pageSignal).toBeDefined());
  mockFetch.mockClear();

  // When
  await act(async () => {
    await client.refetchQueries({
      predicate: ({ queryKey }) =>
        ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
      type: "active",
    });
  });
  await waitFor(() => expect(pageSignal?.aborted).toBe(true));
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () =>
    pending.resolve(
      Response.json({
        clubs: [
          { club: { id: secondId, name: "Obsolete page" }, city: "Niort" },
        ],
      }),
    ),
  );

  // Then
  expect(screen.getByText("Volley Lyon")).toBeOnTheScreen();
  expect(screen.queryByText("Obsolete page")).toBeNull();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(
    new URL(String(mockFetch.mock.calls[0][0])).searchParams.has("cursor"),
  ).toBe(false);
});

it.each([401, 403, 404])(
  "masks retained cards with an explicit retry after a current HTTP refusal (%s)",
  async (status) => {
    // Given
    const user = userEvent.setup();
    await renderSearch();
    await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
    await screen.findByText("Volley professionnel");
    mockFetch.mockImplementation((url: string) =>
      url.includes("/teams?")
        ? Promise.resolve(
            Response.json({ title: "Unavailable", status }, { status }),
          )
        : publicReads(url),
    );

    // When
    await act(async () => {
      await client.refetchQueries({
        predicate: ({ queryKey }) =>
          ["/clubs", "/teams", "/pools"].includes(String(queryKey[0])),
        type: "active",
      });
    });

    // Then
    expect(
      await screen.findByRole("button", { name: "Réessayer" }),
    ).toBeEnabled();
    expect(screen.queryByText("Volley professionnel")).not.toBeOnTheScreen();
    expect(
      screen.queryByText("Aucun résultat pour ces critères"),
    ).not.toBeOnTheScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Une erreur est survenue",
    );
  },
);

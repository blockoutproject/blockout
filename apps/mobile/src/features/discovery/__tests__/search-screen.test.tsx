import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FlatList } from "react-native";
import { SearchVisitProvider } from "../forms/search-visit";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
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
import type { PropsWithChildren } from "react";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";

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
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useNavigation: () => ({ isFocused: mockIsFocused }),
}));
jest.mock("../../../shared/api/binary-image-preview", () => ({
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
let client = createQueryClient();

/** Controls HTTP only; generation, response validation, Query, session and admission stay real. */
function publicReads(url: string): Promise<Response> {
  const path = new URL(url).pathname;
  if (path.endsWith("/application-access"))
    return Promise.resolve(Response.json(applicationAccessResponse()));
  if (path.endsWith("/sporting-search-options"))
    return Promise.resolve(
      Response.json({
        resourceType: new URL(url).searchParams.get("resourceType"),
        seasons: [season],
        divisions: [],
        formats: ["6x6", "4x4", "2x2"],
        genders: ["female", "male", "mixed"],
      }),
    );
  if (path.endsWith("/clubs"))
    return Promise.resolve(
      Response.json({
        clubs: [
          { club: { id: firstId, name: "Volley" }, city: "Lyon" },
          { club: { id: secondId, name: "Volley" }, city: "Niort" },
        ],
      }),
    );
  if (path.endsWith("/teams"))
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
  if (path.endsWith("/pools"))
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
  throw new Error(`Unexpected controlled request ${path}`);
}

beforeEach(() => {
  mockIsFocused.mockReset().mockReturnValue(true);
  client = createQueryClient();
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
  client.clear();
  process.env = { ...environment };
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
});

/** Supplies the actual required owners; membership changes presentation only. */
function SearchOwners({
  children,
  proAccent = false,
}: PropsWithChildren<{ proAccent?: boolean }>) {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <QueryClientProvider client={client}>
          <ThemeProvider proAccent={proAccent}>
            <ApplicationAccessProvider>
              <AccountSessionProvider>
                <AccountFeedbackProvider>
                  <SearchVisitProvider>{children}</SearchVisitProvider>
                </AccountFeedbackProvider>
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
  "leaves an inactive mounted search unread and retains its %s on tab return",
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
      await client.refetchQueries({ queryKey: ["discovery"], type: "active" });
    });
    await rerender({ active: true });

    // Then: hidden scenes are not active refetch targets, and returning replays no old read.
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isError).toBe(outcome === "failure");
    expect(result.current.data !== undefined).toBe(outcome === "success");
  },
);

it.each(["guest", "free", "Pro", "unresolved"])(
  "allows all three public tabs for %s without waiting for Pro",
  async (access) => {
    // Given: no RevenueCat dependency is mounted; unresolved native restoration must not block public reads.
    const restoration = Promise.withResolvers<boolean>();
    if (access === "unresolved")
      mockAuth0.hasValidCredentials.mockReturnValue(restoration.promise);
    else mockAuth0.hasValidCredentials.mockResolvedValue(access !== "guest");
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
  await layoutNativeTabs();

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
  await layoutNativeTabs();

  // Then: the visited result and sporting controls return without a new request.
  expect(await screen.findByText("Volley professionnel")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "1 résultat chargé" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Équipes", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Filtres" })).toBeOnTheScreen();
  expect(screen.getByLabelText("Rechercher")).toHaveDisplayValue("Volley");
  expect(mockFetch).not.toHaveBeenCalled();
});

it("reads changed text only for the selected resource and resets all cached native lists", async () => {
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

  // When: returning to accepted criteria remounts three real loaded list owners.
  mockFetch.mockClear();
  const scroll = jest.spyOn(FlatList.prototype, "scrollToOffset");
  await fireEvent.changeText(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Volley professionnel");

  // Then: all loaded contexts reset while only the selected resource rereads its changed criteria.
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(new URL(String(mockFetch.mock.calls[0][0])).pathname).toBe("/teams");
  expect(scroll.mock.calls).toEqual(
    Array(3).fill([{ offset: 0, animated: false }]),
  );
  expect(new Set(scroll.mock.contexts).size).toBe(3);
});

it("clears the shared query through the approved search action without fetching empty text", async () => {
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
  expect(mockFetch).not.toHaveBeenCalled();
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
    await screen.findByRole("progressbar", { name: "Chargement en cours" }),
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

it("keeps clearing available without pull-to-refresh through replacement reads and preserves the selected tab", async () => {
  // Given: replacement text is pasted directly, without unmounting results through an empty draft.
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/clubs")) {
      if (parsed.searchParams.get("q") === "None") return pending.promise;
      if (parsed.searchParams.get("q") === "Failed")
        return Promise.resolve(
          Response.json({ title: "Unavailable", status: 503 }, { status: 503 }),
        );
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
  expect(screen.getByRole("header", { name: "Résultats" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Effacer" })).toBeEnabled();
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
  expect(
    screen.queryByRole("button", { name: "Effacer" }),
  ).not.toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
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

it("does not replay a failed read on focus, reconnect or a visited-tab return", async () => {
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
  expect(screen.getByRole("header", { name: "Résultats" })).toBeOnTheScreen();
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
  expect(screen.getByRole("header", { name: "Résultats" })).toBeOnTheScreen();
  expect(
    screen.queryByRole("header", { name: "2 résultats chargés" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/teams?")),
  ).toHaveLength(0);
});

it("leaves empty and whitespace-only text unqueried until the examples owner is delivered", async () => {
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
  ).toBe(false);
  expect(screen.queryByText("Exemples")).not.toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

it.each([200, 503])(
  "does not replay a logo read after status %i when returning to its tab",
  async (status) => {
    // Given: native Blob-to-image conversion and HTTP are controlled; generated reads and Query remain real.
    mockFetch.mockImplementation((url: string) => {
      if (new URL(url).pathname.endsWith("/logo"))
        return Promise.resolve(
          status === 200
            ? new Response("synthetic-image", {
                headers: { "Content-Type": "image/png" },
              })
            : Response.json({ status: 503 }, { status: 503 }),
        );
      if (url.includes("/teams?"))
        return Promise.resolve(
          Response.json({
            teams: [
              {
                team: {
                  id: firstId,
                  name: "Volley",
                  logoUrl: `/teams/${firstId}/logo`,
                },
                season,
                classification: {},
                professional: false,
              },
            ],
          }),
        );
      return publicReads(url);
    });
    const user = userEvent.setup();
    await renderSearch();
    await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.filter(([url]) =>
          new URL(String(url)).pathname.endsWith("/logo"),
        ),
      ).toHaveLength(1),
    );
    if (status === 503)
      await screen.findByRole("image", { name: "Logo indisponible : Volley" });

    // When
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    await screen.findByText("Niort");
    await user.press(screen.getByRole("tab", { name: "Équipes" }));
    await screen.findByText("Volley");

    // Then
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(String(url)).pathname.endsWith("/logo"),
      ),
    ).toHaveLength(1);
    if (status === 503)
      expect(
        screen.getByRole("image", { name: "Logo indisponible : Volley" }),
      ).toBeOnTheScreen();
  },
);

it("retries native rendering after a successful logo reread with identical bytes", async () => {
  // Given: native decoding returns the same URI; HTTP, Query and the card remain real.
  mockFetch.mockImplementation((url: string) => {
    if (new URL(url).pathname.endsWith("/logo"))
      return Promise.resolve(
        new Response("synthetic-image", {
          headers: { "Content-Type": "image/png" },
        }),
      );
    if (url.includes("/teams?"))
      return Promise.resolve(
        Response.json({
          teams: [
            {
              team: {
                id: firstId,
                name: "Volley",
                logoUrl: `/teams/${firstId}/logo`,
              },
              season,
              classification: {},
              professional: false,
            },
          ],
        }),
      );
    return publicReads(url);
  });
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await fireEvent(
    await screen.findByRole("image", { name: "Logo : Volley" }),
    "error",
    { nativeEvent: { error: "Native decode failed" } },
  );
  expect(
    screen.getByRole("image", { name: "Logo indisponible : Volley" }),
  ).toBeOnTheScreen();

  // When
  await act(async () => {
    await client.refetchQueries({
      predicate: (query) => query.queryKey.includes(`/teams/${firstId}/logo`),
    });
  });

  // Then
  expect(
    await screen.findByRole("image", { name: "Logo : Volley" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("image", { name: "Logo indisponible : Volley" }),
  ).not.toBeOnTheScreen();
});

it.each(["empty", "error"])(
  "retains the draft and selected tab when an %s search is read again",
  async (state) => {
    // Given
    const user = userEvent.setup();
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname.endsWith("/clubs")
        ? Promise.resolve(
            state === "empty"
              ? Response.json({ clubs: [] })
              : Response.json(
                  { title: "Unavailable", status: 503 },
                  { status: 503 },
                ),
          )
        : publicReads(url),
    );
    await renderSearch();
    await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
    await user.press(screen.getByRole("tab", { name: "Clubs" }));
    if (state === "empty")
      await screen.findByText("Aucun résultat pour ces critères");
    else await screen.findByRole("button", { name: "Réessayer" });
    mockFetch.mockReset().mockImplementation(publicReads);

    // When
    if (state === "error")
      await user.press(screen.getByRole("button", { name: "Réessayer" }));
    else
      await act(async () => {
        await client.refetchQueries({
          queryKey: ["discovery"],
          type: "active",
        });
      });

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

it("continues only the active resource and shares one pending native end request", async () => {
  // Given: RNCT retains the club scene after selecting another resource.
  const user = userEvent.setup();
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/clubs")) return publicReads(url);
    if (parsed.searchParams.has("cursor")) return pending.promise;
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
  expect(mockFetch).not.toHaveBeenCalled();

  // When: Router retains Search beneath another main tab or a filter sheet.
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  mockIsFocused.mockReturnValue(false);
  await fireEvent(await screen.findByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });

  // Then: internal tab selection does not authorize a hidden route's continuation.
  expect(mockFetch).not.toHaveBeenCalled();

  // When: the focused scene reaches its end twice while its page is pending.
  mockIsFocused.mockReturnValue(true);
  await fireEvent(screen.getByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });
  expect(
    await screen.findByRole("progressbar", { name: "Chargement en cours" }),
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
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(
    new URL(String(mockFetch.mock.calls[0][0])).searchParams.get("cursor"),
  ).toBe("next-page");
  expect(screen.queryByRole("button", { name: "Charger la suite" })).toBeNull();
});

it("retains loaded rows with failure toast and retries only the same cursor", async () => {
  // Given
  const user = userEvent.setup();
  const retry = Promise.withResolvers<Response>();
  const first = { club: { id: firstId, name: "Volley Lyon" }, city: "Lyon" };
  let nextPageAvailable = false;
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith("/clubs")) return publicReads(url);
    if (!parsed.searchParams.has("cursor"))
      return Promise.resolve(
        Response.json({ clubs: [first], nextCursor: "next-page" }),
      );
    return nextPageAvailable
      ? retry.promise
      : Promise.resolve(
          Response.json({ title: "Unavailable", status: 500 }, { status: 500 }),
        );
  });
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await fireEvent(await screen.findByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });
  await screen.findByRole("button", {
    name: "Réessayer",
  });
  expect(screen.getByText("Volley Lyon")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "1 résultat chargé" }),
  ).toBeOnTheScreen();
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();
  nextPageAvailable = true;
  mockFetch.mockClear();

  // When: repeated native end events and returning to the failed context never replay it.
  await fireEvent(screen.getByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByText("Volley professionnel");
  mockFetch.mockClear();
  await fireEvent(
    screen.getByText("Volley Lyon", { includeHiddenElements: true }),
    "endReached",
    { distanceFromEnd: 0 },
  );
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await fireEvent(await screen.findByText("Volley Lyon"), "endReached", {
    distanceFromEnd: 0,
  });
  expect(mockFetch).not.toHaveBeenCalled();

  // When
  await user.press(
    screen.getByRole("button", {
      name: "Réessayer",
    }),
  );

  // Then: the same continuation becomes pending while already loaded rows stay readable.
  expect(
    await screen.findByRole("progressbar", { name: "Chargement en cours" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Volley Lyon")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", {
      name: "Réessayer",
    }),
  ).not.toBeOnTheScreen();

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
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.map(([url]) =>
      new URL(String(url)).searchParams.get("cursor"),
    ),
  ).toEqual(["next-page"]);
});

it.each([false, true])(
  "retains accepted pages through a failed background read and accepts the next traversal: %s",
  async (fails) => {
    // Given
    const user = userEvent.setup();
    mockFetch.mockImplementation((url: string) => {
      const parsed = new URL(url);
      if (!parsed.pathname.endsWith("/clubs")) return publicReads(url);
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
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        fails
          ? Response.json(
              { title: "Unavailable", status: 500 },
              { status: 500 },
            )
          : Response.json(
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

    // When
    await act(async () => {
      await client.refetchQueries({ queryKey: ["discovery"], type: "active" });
    });
    if (fails) {
      await user.press(screen.getByRole("tab", { name: "Équipes" }));
      await screen.findByText("Volley professionnel");
      await user.press(screen.getByRole("tab", { name: "Clubs" }));
      expect(await screen.findByText("Volley Lyon")).toBeOnTheScreen();
      expect(screen.getByText("Volley Niort")).toBeOnTheScreen();
      expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
      expect(
        screen.getByRole("header", { name: "2 résultats chargés" }),
      ).toBeOnTheScreen();
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
      await act(async () => {
        await client.refetchQueries({
          queryKey: ["discovery"],
          type: "active",
        });
      });
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
    if (!parsed.pathname.endsWith("/clubs")) return publicReads(url);
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
    await client.refetchQueries({ queryKey: ["discovery"], type: "active" });
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
  "replaces retained search results after a current access or visibility refusal (%s)",
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
      await client.refetchQueries({ queryKey: ["discovery"], type: "active" });
    });

    // Then
    expect(
      await screen.findByText("Une erreur est survenue"),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        "Une erreur est survenue. Veuillez réessayer plus tard.",
      ),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("Volley professionnel")).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
    expect(
      screen.queryByText("Aucun résultat pour ces critères"),
    ).not.toBeOnTheScreen();
  },
);

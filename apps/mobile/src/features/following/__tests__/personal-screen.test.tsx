import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import {
  onlineManager,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";
import { AccessibilityInfo, View } from "react-native";
import { getGetMyAccountQueryKey } from "../../../../.generated/mobile";
import type { PersonalMatchCalendarResponse } from "../../../../.generated/schemas/index.zod";
import { renderRouter } from "expo-router/testing-library";
import { PersonalSeasonProvider } from "../components/personal-season-provider";
import { PersonalNavigation } from "../screens/personal-navigation";
import { PersonalSeasonScreen } from "../screens/personal-season-screen";
import {
  useEffect,
  useState,
  type ReactNode,
  type PropsWithChildren,
  type ComponentType,
} from "react";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import {
  TECHNICAL_ERROR,
  TECHNICAL_ERROR_TITLE,
} from "../../../shared/components/error-copy";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import {
  AccountSessionProvider,
  useAccountSession,
  type AccountSession,
} from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ClubScreen } from "../../sporting/screens/club-screen";
import { SearchScreen } from "../../discovery/screens/search-screen";
import { SearchVisitProvider } from "../../discovery/forms/search-visit";
import { MatchScreen } from "../../sporting/screens/match-screen";
import {
  clubDetail,
  matchDetail,
} from "../../sporting/test-support/consultation-data";
import { PersonalScreen } from "../screens/personal-screen";
import { FollowButton } from "../components/follow-button";
import { followListKey, followOptionsKey } from "../api/following-keys";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import * as proSessionModule from "../../pro/pro-session";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
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
  useRouter: () => ({
    push: (href: unknown) => {
      mockPush(href);
      if (href === "/season") {
        jest.requireActual("expo-router").router.push(href);
      }
    },
    back: () => {
      mockBack();
      const router = jest.requireActual("expo-router").router;
      if (router.canGoBack()) {
        router.back();
      }
    },
    canGoBack: () => true,
  }),
  useNavigation: () => ({ isFocused: () => mockFocus.focused }),
  useIsFocused: () => {
    const { useSyncExternalStore } =
      jest.requireActual<typeof import("react")>("react");
    return useSyncExternalStore(
      (listener) => {
        mockFocus.listeners.add(listener);
        return () => {
          mockFocus.listeners.delete(listener);
        };
      },
      () => mockFocus.focused,
    );
  },
}));
// The official native-inset double supplies the Modal window's measurement event in Jest.
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo/fetch", () => ({
  fetch: (url: string, request?: RequestInit) => mockFetch(url, request),
}));
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockFocus = { focused: true, listeners: new Set<() => void>() };
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const accountId = "00000000-0000-4000-8000-000000000001";
const older = {
  id: "00000000-0000-4000-8000-000000000002",
  startYear: 2025,
  label: "2025/2026",
};
const newer = {
  id: "00000000-0000-4000-8000-000000000003",
  startYear: 2026,
  label: "2026/2027",
};
const team = {
  type: "team",
  id: "00000000-0000-4000-8000-000000000004",
} as const;
const profile = accountResponse({
  accountId,
  username: "Synthetic",
  email: "synthetic@example.invalid",
});
const environment = { ...process.env };
let publicClient = createQueryClient();
let client = publicClient;
let clients = new Set([publicClient]);
let session: AccountSession;
let proposed = older;
let following = false;

/** Uses the root's real private-query cleanup; native identity/inset I/O and HTTP are controlled. */
function SessionBinding({ children }: Readonly<PropsWithChildren>) {
  const current = useAccountSession();
  const privateClient = useQueryClient();
  privateClient.setDefaultOptions({
    queries: { retry: false },
    mutations: { networkMode: "always", retry: false, gcTime: Infinity },
  });
  useEffect(() => {
    clients.add(privateClient);
    client = privateClient;
    session = current;
  }, [current, privateClient]);
  return children;
}

/** Keeps the single product season owner above both real native routes; other sporting navigation remains a command boundary. */
function PersonalLayout() {
  return (
    <PersonalSeasonProvider>
      <PersonalNavigation />
    </PersonalSeasonProvider>
  );
}

/** Provides real session, admission, advertising, Query and route owners for Home and its season surface. */
async function mount(extra?: ReactNode) {
  return renderRouter(
    {
      _layout: {
        default: PersonalLayout,
        unstable_settings: { anchor: "index" },
      },
      index: () => (
        <>
          <PersonalScreen />
          {extra}
        </>
      ),
      "(sheets)/season": PersonalSeasonScreen,
    },
    {
      initialUrl: "/",
      wrapper: ({ children }) => (
        <GestureHandlerRootView>
          <QueryClientProvider client={publicClient}>
            <ThemeProvider>
              <ApplicationAccessProvider>
                <AccountSessionProvider>
                  <AccountFeedbackProvider>
                    <AdvertisingProviders>
                      <SessionBinding>{children}</SessionBinding>
                    </AdvertisingProviders>
                  </AccountFeedbackProvider>
                </AccountSessionProvider>
              </ApplicationAccessProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      ),
    },
  );
}

/** Completes a native horizontal page gesture through the existing pager I/O double. */
async function swipeHomePage(position: number) {
  const pager = screen.getByTestId("native-tabs-pager");
  await fireEvent(pager, "pageSelected", { nativeEvent: { position } });
  await fireEvent(pager, "pageScroll", {
    nativeEvent: { position, offset: 0 },
  });
  await fireEvent(pager, "pageScrollStateChanged", {
    nativeEvent: { pageScrollState: "idle" },
  });
}

/** Synthetic current-owner HTTP responses go through the actual generated validation. */
async function transport(url: string, request?: RequestInit) {
  if (url.endsWith("/application-access")) {
    return Response.json(applicationAccessResponse());
  }
  if (url.endsWith("/accounts/me")) {
    return Response.json(profile);
  }
  if (url.includes("follow-options")) {
    return Response.json({
      seasons: [newer, older],
      defaultSeasonId: proposed.id,
    });
  }
  if (new URL(url).pathname === `/accounts/${accountId}/team-follows`) {
    return Response.json({
      items: [
        {
          team: { id: team.id, name: "Étoile" },
          professional: false,
          season: older,
          classification: {},
        },
      ],
    });
  }
  if (new URL(url).pathname === `/accounts/${accountId}/pool-follows`) {
    return Response.json({
      items: [
        {
          pool: { id: newer.id, name: "Poule A" },
          season: older,
          classification: {},
        },
      ],
    });
  }
  if (new URL(url).pathname === `/accounts/${accountId}/matches`) {
    return Response.json({
      hasAvailableFollows: true,
      calendar: {
        category: new URL(url).searchParams.get("category"),
        timeZone: new URL(url).searchParams.get("timeZone"),
        evaluatedAt: "2026-10-28T12:00:00Z",
        days: [
          {
            date: "2026-10-29",
            pools: [{ poolId: team.id, matches: [matchDetail().match] }],
          },
        ],
      },
    });
  }
  if (request?.method === "PUT") {
    proposed = newer;
    following = true;
    return Response.json({ following: true });
  }
  return Response.json({ following });
}

beforeEach(() => {
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  publicClient = createQueryClient();
  client = publicClient;
  clients = new Set([publicClient]);
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
    mutations: { ...client.getDefaultOptions().mutations, gcTime: Infinity },
  });
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "test-client",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(transport);
  mockPush.mockReset();
  mockBack.mockReset();
  proposed = older;
  following = false;
  mockFocus.focused = true;
});

it("shows separate current teams and pools in Following and opens their exact sporting destinations", async () => {
  // Given
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  expect(
    mockFetch.mock.calls.some(([url]) => /\/(team|pool)-follows\?/.test(url)),
  ).toBe(false);

  // When
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  const teamLink = await screen.findByRole("link", { name: /Étoile/ });
  const poolLink = await screen.findByRole("link", { name: /Poule A/ });
  await userEvent.press(teamLink);
  await userEvent.press(poolLink);

  // Then
  expect(
    screen.getByRole("button", { name: "Équipes suivies", expanded: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Poules suivies", expanded: true }),
  ).toBeOnTheScreen();
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/teams/[teamId]",
    params: { teamId: team.id },
  });
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/pools/[poolId]",
    params: { poolId: newer.id },
  });
  expect(
    mockFetch.mock.calls
      .filter(([url]) => /\/(team|pool)-follows\?/.test(url))
      .map(([url]) => new URL(url).searchParams.get("seasonId")),
  ).toEqual([older.id, older.id]);
});
afterEach(async () => {
  await cleanup();
  for (const cache of clients) {
    cache.clear();
  }
  clients.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("keeps the selected season after an actual other-season follow invalidates current options", async () => {
  // Given
  const user = userEvent.setup();
  await mount(<FollowButton target={team} season={newer} />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );

  // When
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "Suivis" }));
  await screen.findByRole("tab", { name: "Suivis", selected: true });
  await user.press(
    screen.getByRole("button", { name: "Suivre", disabled: false }),
  );

  // Then
  await screen.findByRole("button", { name: "Suivi", busy: false });
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => url.includes("follow-options"))
        .length,
    ).toBe(2),
  );
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
  expect(
    screen.getByRole("tab", { name: "Suivis", selected: true }),
  ).toBeOnTheScreen();
});

it("keeps list failures distinct from emptiness and retains the accepted personal calendar", async () => {
  // Given: list transport fails independently of the retained calendar and season.
  const user = userEvent.setup();
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockClear();
  mockFetch.mockImplementation((url, request) =>
    /\/(team|pool)-follows\?/.test(url)
      ? Promise.reject(new TypeError("Synthetic list outage"))
      : transport(url, request),
  );

  // When
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "Suivis" }));

  // Then: the open collections share one Following card, with no false empty state.
  expect(
    await screen.findAllByRole("button", { name: "Réessayer" }),
  ).toHaveLength(1);
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  expect(screen.queryByText("Aucun suivi à afficher")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Suivis", selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Saison des suivis", disabled: false }),
  ).toHaveAccessibilityValue({ text: older.label });
  expect(mockFetch).toHaveBeenCalledTimes(2);
  mockFetch.mockClear();

  // When
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "À venir" }));

  // Then: returning to the accepted context replays no calendar or list request.
  expect(
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("waits for a collapsed Following section before reading its reset collection", async () => {
  // Given: the accepted sibling stays in Query while the collapsed pool traversal is reset.
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  await screen.findByRole("link", { name: /Étoile/ });
  await screen.findByRole("link", { name: /Poule A/ });
  await userEvent.press(
    screen.getByRole("button", { name: "Poules suivies", expanded: true }),
  );
  mockFetch
    .mockClear()
    .mockImplementation((url, request) =>
      new URL(url).pathname.endsWith("/pool-follows")
        ? Promise.reject(new TypeError("Synthetic pool outage"))
        : transport(url, request),
    );

  // When
  await act(async () => {
    await client.resetQueries({
      queryKey: followListKey({ accountId, subject: session.subject }, "pool", {
        seasonId: older.id,
      }),
      exact: true,
    });
  });

  // Then
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: /Étoile/ })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();

  // When
  await userEvent.press(
    screen.getByRole("button", { name: "Poules suivies", expanded: false }),
  );

  // Then: the necessary open-section failure owns the whole Following content.
  await screen.findByRole("button", { name: "Réessayer" });
  expect(screen.queryByRole("link", { name: /Étoile/ })).toBeNull();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("keeps one Following card through a paused multi-read Retry and until its last failed section succeeds", async () => {
  // Given: both open collections fail after the shared account and season are usable.
  const teamRetry = Promise.withResolvers<Response>();
  const poolRetry = Promise.withResolvers<Response>();
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  mockFetch.mockImplementation((url, request) =>
    /\/(team|pool)-follows\?/.test(url)
      ? Promise.reject(new TypeError("Synthetic collection outage"))
      : transport(url, request),
  );
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  await screen.findByRole("button", { name: "Réessayer", busy: false });
  mockFetch.mockClear().mockImplementation((url, request) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/team-follows")) {
      return teamRetry.promise;
    }
    if (pathname.endsWith("/pool-follows")) {
      return poolRetry.promise;
    }
    return transport(url, request);
  });

  try {
    // When: Query pauses the explicit attempt while offline.
    await act(() => onlineManager.setOnline(false));
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    expect(mockFetch).not.toHaveBeenCalled();

    // When
    await act(() => onlineManager.setOnline(true));
    await screen.findByRole("button", { name: "Réessayer", busy: true });
    await act(async () =>
      teamRetry.resolve(
        await transport(
          `https://api.example.invalid/accounts/${accountId}/team-follows`,
        ),
      ),
    );

    // Then: resolving one read does not replace the shared card or stop its real remaining progress.
    await screen.findByRole("button", { name: "Réessayer", busy: true });
    expect(screen.queryByRole("link", { name: /Étoile/ })).toBeNull();

    // When
    await act(async () =>
      poolRetry.resolve(
        await transport(
          `https://api.example.invalid/accounts/${accountId}/pool-follows`,
        ),
      ),
    );

    // Then
    await screen.findByRole("link", { name: /Étoile/ });
    await screen.findByRole("link", { name: /Poule A/ });
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        /\/(team|pool)-follows\?/.test(url),
      ),
    ).toHaveLength(2);
  } finally {
    await act(async () => {
      onlineManager.setOnline(true);
      teamRetry.resolve(
        await transport(
          `https://api.example.invalid/accounts/${accountId}/team-follows`,
        ),
      );
      poolRetry.resolve(
        await transport(
          `https://api.example.invalid/accounts/${accountId}/pool-follows`,
        ),
      );
    });
  }
});

it("replaces failed season choices with their read card and restores the retained selection after Retry", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );
  await layoutNativeTabs();
  mockFetch.mockImplementation((url, request) =>
    url.includes("follow-options")
      ? Promise.reject(new TypeError("Synthetic network failure"))
      : transport(url, request),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));

  // Then
  await screen.findByRole("button", { name: "Réessayer" });
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => url.includes("follow-options"))
        .length,
    ).toBe(2),
  );
  expect(screen.queryByRole("radio", { name: newer.label })).toBeNull();
  expect(screen.queryByRole("alert", { name: TECHNICAL_ERROR })).toBeNull();

  // When: the sheet retries its existing shared read without changing the choice.
  mockFetch.mockClear().mockImplementation(transport);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await screen.findByRole("radio", { name: older.label, checked: true });
  expect(
    mockFetch.mock.calls.filter(([url]) => url.includes("follow-options")),
  ).toHaveLength(1);

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then: the successful shared read also restores Home's prerequisite.
  expect(
    screen.getByRole("button", { name: "Saison des suivis", disabled: false }),
  ).toHaveAccessibilityValue({ text: older.label });

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));

  // Then
  expect(
    await screen.findByRole("radio", { name: older.label, checked: true }),
  ).toBeOnTheScreen();
});

it("replaces Home's content after a technical profile failure and restores the retained calendar, tab and season", async () => {
  // Given: Home and Query are real; only the profile HTTP response changes.
  const user = userEvent.setup();
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  await user.press(await screen.findByRole("radio", { name: newer.label }));
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/accounts/me")
      ? Promise.resolve(new Response(null, { status: 503 }))
      : transport(url, request),
  );

  // When
  await act(() =>
    client.refetchQueries({
      queryKey: getGetMyAccountQueryKey(),
      exact: true,
    }),
  );

  // Then
  await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
  ).toHaveAccessibilityValue({ text: newer.label });
  expect(
    screen.getByRole("tab", { name: "Terminés", selected: true }),
  ).toBeOnTheScreen();

  // When
  mockFetch.mockClear().mockImplementation(transport);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then: the same confirmed selection and cached calendar return without another collection request.
  expect(
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Terminés", selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Saison des suivis", disabled: false }),
  ).toHaveAccessibilityValue({ text: newer.label });
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      /\/(matches|team-follows|pool-follows)\?/.test(url),
    ),
  ).toHaveLength(0);
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

it.each([401, 403, 404])(
  "withdraws the personal calendar and open season sheet after a profile %i refusal",
  async (status) => {
    // Given
    const user = userEvent.setup();
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
    await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
    await screen.findByRole("radio", { name: older.label, checked: true });
    mockFetch.mockImplementation((url, request) =>
      url.endsWith("/accounts/me")
        ? Promise.resolve(new Response(null, { status }))
        : transport(url, request),
    );

    // When
    await act(() =>
      client.refetchQueries({
        queryKey: getGetMyAccountQueryKey(),
        exact: true,
      }),
    );

    // Then
    await waitFor(() => expect(screen).toHavePathname("/"));
    expect(
      screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Saison des suivis" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("radio", { name: older.label }),
    ).not.toBeOnTheScreen();
  },
);

it("removes the personal selector when its actual session signs out and uses the shared invitation", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });

  const originalClient = client;

  // When
  await act(async () => session.signOut());
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  expect(
    screen.queryByRole("button", { name: "Saison des suivis" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/sign-in-invitation",
    params: { reason: "follow" },
  });
  expect(client).not.toBe(originalClient);
  expect(originalClient.getQueryCache().getAll()).toHaveLength(0);
});

it("leaves the actual club-season and search-input owners unchanged", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, request) => {
    if (url.includes("/clubs/") && url.includes("/teams")) {
      return Promise.resolve(Response.json({ seasonId: older.id, items: [] }));
    }
    if (url.includes("/clubs/")) {
      return Promise.resolve(
        Response.json({ ...clubDetail(), seasons: [older, newer] }),
      );
    }
    if (url.includes("/sporting-search-options?")) {
      return Promise.resolve(
        Response.json({
          resourceType: new URL(url).searchParams.get("resourceType"),
          seasons: [older],
          divisions: [],
          formats: ["6x6", "4x4", "2x2"],
          genders: ["female", "male", "mixed"],
        }),
      );
    }
    if (url.includes("/teams?")) {
      return Promise.resolve(Response.json({ teams: [] }));
    }
    return transport(url, request);
  });
  await mount(
    <>
      <View accessibilityLabel="Public club">
        <ClubScreen clubId={team.id} />
      </View>
      <SearchVisitProvider>
        <SearchScreen />
      </SearchVisitProvider>
    </>,
  );
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  const clubTeams = await within(
    screen.getByLabelText("Public club"),
  ).findByRole("tab", { name: "Équipes" });
  await layoutNativeTabs();
  await user.press(clubTeams);
  await screen.findByRole("button", { name: "Saison du club" });
  await user.type(
    screen.getByPlaceholderText("Rechercher une équipe…"),
    "Volleyball",
  );
  await screen.findByText("Aucun résultat pour ces critères");

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  await user.press(screen.getByRole("radio", { name: newer.label }));

  // Then
  expect(
    screen.getByRole("button", { name: "Saison du club" }),
  ).toHaveAccessibilityValue({ text: older.label });
  expect(screen.getByDisplayValue("Volleyball")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(url).pathname === "/teams")
      .every(([url]) => new URL(url).searchParams.get("seasonId") === older.id),
  ).toBe(true);
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: newer.label });
});

it("keeps all Home pages during the first common read, failure and active Retry without premature collection reads", async () => {
  // Given: Query, generated validation and PagedTabs are real; HTTP completion and native pager I/O are controlled.
  const initial = Promise.withResolvers<Response>();
  const retry = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/follow-options") ? initial.promise : transport(url, request),
  );
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: true,
  });

  try {
    // Then: an active first read retains the native gesture owner and defers every dependent read.
    await layoutNativeTabs();
    const pager = screen.getByTestId("native-tabs-pager");
    expect(pager).toBeOnTheScreen();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(
      screen.getByRole("progressbar", { name: "Chargement des matchs" }),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        /\/(matches|team-follows|pool-follows)\?/.test(url),
      ),
    ).toHaveLength(0);

    // When
    await act(() => initial.resolve(new Response(null, { status: 503 })));
    await screen.findByRole("button", { name: "Réessayer", busy: false });
    await swipeHomePage(1);

    // Then
    expect(pager).toBeOnTheScreen();
    expect(
      screen.getByRole("tab", { name: "Terminés", selected: true }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
    ).toHaveAccessibilityValue({ text: "Saison" });
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(1);
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        /\/(matches|team-follows|pool-follows)\?/.test(url),
      ),
    ).toHaveLength(0);

    // When: a no-data Retry returns Query to pending, retaining the card in its initiating scene.
    mockFetch.mockImplementation((url, request) =>
      url.endsWith("/follow-options")
        ? retry.promise
        : /\/(team|pool)-follows\?/.test(url)
          ? Promise.resolve(Response.json({ items: [] }))
          : transport(url, request),
    );
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByRole("button", { name: "Réessayer", busy: true });
    await swipeHomePage(0);

    // Then: the shared request does not animate another scene's idle action or start a collection.
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: true }),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(2);
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        /\/(matches|team-follows|pool-follows)\?/.test(url),
      ),
    ).toHaveLength(0);

    // When
    await act(() => retry.resolve(Response.json({ seasons: [] })));

    // Then: only a successful common result admits the selected collections and confirmed Empty.
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await screen.findByText("Aucun suivi à afficher");
    expect(
      screen.getByRole("tab", { name: "Suivis", selected: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  } finally {
    await act(() => {
      initial.resolve(Response.json({ seasons: [] }));
      retry.resolve(Response.json({ seasons: [] }));
    });
  }
});

it("keeps the Home season and selected page through suspended Retry, repeated common failure and recovery", async () => {
  // Given
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await userEvent.press(
    screen.getByRole("button", { name: "Saison des suivis" }),
  );
  await userEvent.press(
    await screen.findByRole("radio", { name: newer.label }),
  );
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockImplementation((url, request) =>
    url.endsWith("/follow-options")
      ? Promise.resolve(new Response(null, { status: 503 }))
      : transport(url, request),
  );
  await act(() =>
    client.refetchQueries({
      queryKey: followOptionsKey({ accountId, subject: session.subject }),
      exact: true,
    }),
  );
  await screen.findByRole("button", { name: "Réessayer" });
  const repeated = Promise.withResolvers<Response>();
  const recovered = Promise.withResolvers<Response>();
  mockFetch
    .mockClear()
    .mockImplementation((url, request) =>
      url.endsWith("/follow-options")
        ? repeated.promise
        : transport(url, request),
    );

  try {
    // When: an ordinary offline Query suspends the explicit action without simulated active progress.
    await act(() => onlineManager.setOnline(false));
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    expect(mockFetch).not.toHaveBeenCalled();
    await swipeHomePage(1);
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();

    // When
    await act(() => onlineManager.setOnline(true));
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
      ).toHaveLength(1),
    );

    // Then: completion is shared, but only the initiating scene presents its gesture's active progress.
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("tab", { name: "À venir" }));
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
    ).toHaveAccessibilityValue({ text: newer.label });

    // When
    await act(() => repeated.resolve(new Response(null, { status: 503 })));
    await screen.findByRole("button", { name: "Réessayer", busy: false });
    await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
    mockFetch.mockImplementation((url, request) =>
      url.endsWith("/follow-options")
        ? recovered.promise
        : transport(url, request),
    );
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByRole("button", { name: "Réessayer", busy: true });
    await swipeHomePage(1);

    // Then
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        /\/(matches|team-follows|pool-follows)\?/.test(url),
      ),
    ).toHaveLength(0);

    // When
    await act(() =>
      recovered.resolve(
        Response.json({ seasons: [newer, older], defaultSeasonId: older.id }),
      ),
    );

    // Then
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
    expect(
      screen.getByRole("tab", { name: "Terminés", selected: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Saison des suivis",
        disabled: false,
      }),
    ).toHaveAccessibilityValue({ text: newer.label });
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  } finally {
    await act(() => {
      onlineManager.setOnline(true);
      repeated.resolve(Response.json({ seasons: [] }));
      recovered.resolve(Response.json({ seasons: [] }));
    });
  }
});

it("shows the real season selector after successful empty options", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, request) =>
    url.includes("follow-options")
      ? Promise.resolve(Response.json({ seasons: [] }))
      : transport(url, request),
  );
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", {
        name: "Saison des suivis",
        disabled: false,
      }),
    ).toHaveAccessibilityValue({ text: "Toutes saisons" }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));

  // Then
  expect(
    screen.getByRole("radio", { name: "Toutes les saisons", checked: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("radio", { name: older.label }),
  ).not.toBeOnTheScreen();
});

it.each([403, 404])(
  "suspends retained private choices after a current %i refusal and restores the retained selection only after a successful retry",
  async (status) => {
    // Given
    const user = userEvent.setup();
    await mount();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Saison des suivis" }),
      ).toHaveAccessibilityValue({ text: older.label }),
    );
    await layoutNativeTabs();
    await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
    await user.press(screen.getByRole("radio", { name: newer.label }));
    await layoutNativeTabs();
    mockFetch.mockImplementation((url, request) =>
      url.includes("follow-options")
        ? Promise.resolve(new Response(null, { status }))
        : transport(url, request),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
    await waitFor(() => expect(screen).toHavePathname("/"));
    await layoutNativeTabs();

    // Then
    await screen.findByRole("button", { name: "Réessayer" });
    expect(
      screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
    ).toHaveAccessibilityValue({ text: "Saison" });
    expect(
      screen.queryByRole("radio", { name: older.label }),
    ).not.toBeOnTheScreen();

    // When
    mockFetch.mockImplementation((url, request) =>
      url.includes("follow-options")
        ? Promise.reject(new TypeError("Synthetic retry network failure"))
        : transport(url, request),
    );
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByRole("button", { name: "Réessayer", busy: false });

    // Then
    expect(
      screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
    ).toHaveAccessibilityValue({ text: "Saison" });

    // When
    mockFetch.mockImplementation(transport);
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Saison des suivis",
          disabled: false,
        }),
      ).toHaveAccessibilityValue({ text: newer.label }),
    );
  },
);

it("opens each personal encounter through the existing sporting navigation after native paging", async () => {
  // Given
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  const match = await screen.findByRole("link", {
    name: /Ouvrir le match Home — Away/,
  });

  // When
  await userEvent.press(match);
  await fireEvent(screen.getByTestId("native-tabs-pager"), "pageSelected", {
    nativeEvent: { position: 1 },
  });
  await fireEvent(screen.getByTestId("native-tabs-pager"), "pageScroll", {
    nativeEvent: { position: 1, offset: 0 },
  });
  await fireEvent(
    screen.getByTestId("native-tabs-pager"),
    "pageScrollStateChanged",
    {
      nativeEvent: { pageScrollState: "idle" },
    },
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: matchDetail().match.id },
  });
  await screen.findByRole("tab", { name: "Terminés", selected: true });
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(
        ([url]) => new URL(url).searchParams.get("category") === "completed",
      ),
    ).toHaveLength(1),
  );
});

it.each([false, true])(
  "explains successful empty personal calendars with available follows = %s",
  async (hasAvailableFollows) => {
    // Given
    mockFetch.mockImplementation((url, request) =>
      new URL(url).pathname === `/accounts/${accountId}/matches`
        ? Promise.resolve(
            Response.json({
              hasAvailableFollows,
              calendar: {
                category: "upcoming",
                timeZone: "Europe/Paris",
                evaluatedAt: "2026-10-28T12:00:00Z",
                days: [],
              },
            }),
          )
        : transport(url, request),
    );

    // When
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();

    // Then
    await screen.findByText(
      hasAvailableFollows
        ? "Aucun match pour cette sélection"
        : "Aucun suivi à afficher",
    );
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
    if (!hasAvailableFollows) {
      await userEvent.press(
        screen.getByRole("button", {
          name: "Rechercher une équipe ou une poule",
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/search");
    }
  },
);

it("keeps a failed personal continuation and its season across tab return until footer Retry", async () => {
  // Given: the personal envelope uses the real Query and shared native calendar; HTTP alone is controlled.
  const next = Promise.withResolvers<Response>();
  let failAppend = true;
  mockFetch.mockImplementation(async (url, request) => {
    const target = new URL(url);
    if (
      target.pathname !== `/accounts/${accountId}/matches` ||
      target.searchParams.get("category") !== "upcoming"
    ) {
      return transport(url, request);
    }
    if (target.searchParams.has("nextDay")) {
      if (failAppend) {
        throw new TypeError("Synthetic personal continuation outage");
      }
      return next.promise;
    }
    const response = await transport(url, request);
    const first = await response.json();
    return Response.json({
      ...first,
      calendar: { ...first.calendar, nextDay: "2026-10-29" },
    });
  });
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  const match = await screen.findByRole("link", {
    name: /Ouvrir le match Home — Away/,
  });

  // When
  await fireEvent(match, "endReached");
  await screen.findByRole("button", { name: "Réessayer" });
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));

  // Then: returning observes the same failed continuation without a card or automatic replay.
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

  // When: explicit recovery waits on the same next page.
  failAppend = false;
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("progressbar", { name: "Chargement de la suite…" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

  // When
  await act(async () => {
    const response = await transport(
      `https://api.example.invalid/accounts/${accountId}/matches?category=upcoming&timeZone=Europe%2FParis`,
    );
    next.resolve(response);
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("progressbar", { name: "Chargement de la suite…" }),
    ).not.toBeOnTheScreen(),
  );

  // Then: the repeated response is deduplicated and the successful final page removes feedback.
  expect(
    screen.getAllByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toHaveLength(1);
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .map(([url]) => new URL(url))
      .filter(
        (url) =>
          url.pathname === `/accounts/${accountId}/matches` &&
          url.searchParams.get("category") === "upcoming",
      )
      .map((url) => url.searchParams.get("nextDay")),
  ).toEqual([null, "2026-10-29", "2026-10-29"]);
});

it("keeps a failed personal calendar on its shared card across tab return until explicit Retry", async () => {
  // Given: F06 owns its envelope; the shared F03 view must not make tab return replay a failed read.
  let failUpcoming = true;
  mockFetch.mockImplementation((url, request) =>
    new URL(url).pathname === `/accounts/${accountId}/matches` &&
    new URL(url).searchParams.get("category") === "upcoming" &&
    failUpcoming
      ? Promise.reject(new TypeError("Synthetic initial calendar outage"))
      : transport(url, request),
  );
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("button", { name: "Réessayer" });
  /** Counts only the original failed category, independently of sibling-tab reads. */
  const upcomingReads = () =>
    mockFetch.mock.calls.filter(
      ([url]) =>
        new URL(url).pathname === `/accounts/${accountId}/matches` &&
        new URL(url).searchParams.get("category") === "upcoming",
    );

  // When
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findByRole("button", { name: "Réessayer", busy: false });

  // Then
  expect(upcomingReads()).toHaveLength(1);
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();

  // When
  failUpcoming = false;
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(upcomingReads()).toHaveLength(2);
});

it.each([false, true])(
  "uses the shared full-refresh card after continuation failure = %s and preserves the confirmed-follow reset boundary",
  async (failedContinuation) => {
    // Given
    if (failedContinuation) {
      mockFetch.mockImplementation(async (url, request) => {
        const response = await transport(url, request);
        if (new URL(url).pathname !== `/accounts/${accountId}/matches`) {
          return response;
        }
        const first = await response.json();
        return Response.json({
          ...first,
          calendar: { ...first.calendar, nextDay: "2026-10-29" },
        });
      });
    }
    await mount(<FollowButton target={team} season={older} />);
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
    mockFetch.mockImplementation((url, request) =>
      new URL(url).pathname === `/accounts/${accountId}/matches`
        ? Promise.reject(new TypeError("Synthetic calendar outage"))
        : transport(url, request),
    );
    if (failedContinuation) {
      await fireEvent(
        screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
        "endReached",
      );
      await screen.findByRole("button", { name: "Réessayer" });
      expect(
        screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
      ).toBeOnTheScreen();
    }
    const refreshRead = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url, request) =>
      new URL(url).pathname === `/accounts/${accountId}/matches`
        ? refreshRead.promise
        : transport(url, request),
    );
    mockFetch.mockClear();

    // When
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then: a full read keeps the personal rows and selected season while the native pull is active.
    await waitFor(() =>
      expect(screen.getByLabelText("Actualiser les données")).toBeBusy(),
    );
    expect(
      screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();

    // When
    await act(() => refreshRead.resolve(Response.json({}, { status: 503 })));
    await screen.findByRole("alert");

    // Then
    expect(
      screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
    ).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls
        .map(([url]) => new URL(url))
        .filter((url) => url.pathname === `/accounts/${accountId}/matches`)
        .map((url) => url.searchParams.get("nextDay")),
    ).toEqual([null]);

    // When
    await userEvent.press(
      screen.getByRole("button", { name: "Suivre", disabled: false }),
    );
    await screen.findByRole("button", { name: "Suivi", busy: false });

    // Then
    await screen.findByRole("button", { name: "Réessayer" });
    expect(
      screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });
  },
);

it("ignores an obsolete refresh after the shared season changes without reporting a new-context failure", async () => {
  // Given
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  const late = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, request) =>
    new URL(url).pathname === `/accounts/${accountId}/matches` &&
    new URL(url).searchParams.get("seasonId") === older.id
      ? late.promise
      : transport(url, request),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // When
  await userEvent.press(
    screen.getByRole("button", { name: "Saison des suivis" }),
  );
  await userEvent.press(screen.getByRole("radio", { name: newer.label }));
  await layoutNativeTabs();
  await act(async () => late.reject(new TypeError("Synthetic obsolete read")));

  // Then
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: newer.label });
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it("restarts the selected completed traversal after a confirmed follow change and rejects its late old page", async () => {
  // Given
  let changed = false;
  const late = Promise.withResolvers<Response>();
  const oldSecond = "00000000-0000-4000-8000-000000000041";
  const oldThird = "00000000-0000-4000-8000-000000000042";
  const replacement = "00000000-0000-4000-8000-000000000043";

  /** Supplies valid generated envelopes; cursor and identities remain explicit in each request. */
  function calendar(
    url: string,
    id: string,
    home: string,
    day: string,
    nextDay?: string,
  ): Response {
    const match = matchDetail().match;
    const category =
      new URL(url).searchParams.get("category") === "completed"
        ? "completed"
        : "upcoming";
    const envelope: PersonalMatchCalendarResponse = {
      hasAvailableFollows: true,
      calendar: {
        category,
        timeZone: "Europe/Paris",
        evaluatedAt: "2026-10-28T12:00:00Z",
        days: [
          {
            date: day,
            pools: [
              {
                poolId: team.id,
                matches: [
                  {
                    ...match,
                    id,
                    category,
                    schedule: { ...match.schedule, localDate: day },
                    home: { ...match.home, name: home },
                  },
                ],
              },
            ],
          },
        ],
        ...(nextDay ? { nextDay } : {}),
      },
    };
    return Response.json(envelope);
  }

  mockFetch.mockImplementation((url, request) => {
    const parsed = new URL(url);
    if (request?.method === "PUT") {
      changed = true;
    }
    if (!parsed.pathname.endsWith("/matches")) {
      return transport(url, request);
    }
    if (changed) {
      return Promise.resolve(
        calendar(url, replacement, "Current", "2026-10-20"),
      );
    }
    if (parsed.searchParams.get("nextDay") === "2026-10-19") {
      return late.promise;
    }
    return Promise.resolve(
      parsed.searchParams.has("nextDay")
        ? calendar(url, oldSecond, "Second", "2026-10-19", "2026-10-19")
        : calendar(
            url,
            matchDetail().match.id,
            "First",
            "2026-10-20",
            "2026-10-20",
          ),
    );
  });
  await mount(<FollowButton target={team} season={older} />);
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  const first = await screen.findByRole("link", {
    name: /Ouvrir le match First — Away/,
  });
  await fireEvent(first, "endReached");
  const second = await screen.findByRole("link", {
    name: /Ouvrir le match Second — Away/,
  });
  await fireEvent(second, "endReached");
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(
        ([url]) => new URL(url).searchParams.get("nextDay") === "2026-10-19",
      ),
    ).toBe(true),
  );
  mockFetch.mockClear();

  // When
  await userEvent.press(
    screen.getByRole("button", { name: "Suivre", disabled: false }),
  );
  await screen.findByRole("button", { name: "Suivi", busy: false });
  await screen.findByRole("link", { name: /Ouvrir le match Current — Away/ });
  await act(async () =>
    late.resolve(
      calendar(
        "https://api.example.invalid/?category=completed&timeZone=Europe/Paris",
        oldThird,
        "Obsolete",
        "2026-10-18",
      ),
    ),
  );

  // Then
  expect(
    screen.getByRole("tab", { name: "Terminés", selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
  expect(
    screen.queryByRole("link", {
      name: /Ouvrir le match (First|Second|Obsolete) — Away/,
    }),
  ).not.toBeOnTheScreen();
  const reloads = mockFetch.mock.calls.filter(([url]) =>
    new URL(url).pathname.endsWith("/matches"),
  );
  expect(reloads).toHaveLength(1);
  expect(new URL(reloads[0][0]).searchParams.get("category")).toBe("completed");
  expect(new URL(reloads[0][0]).searchParams.has("nextDay")).toBe(false);
  expect(new URL(reloads[0][0]).searchParams.get("seasonId")).toBe(older.id);

  // When: the mounted hidden category reloads only upon display.
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findByRole("link", { name: /Ouvrir le match Current — Away/ });

  // Then
  const upcoming = mockFetch.mock.calls.filter(
    ([url]) => new URL(url).searchParams.get("category") === "upcoming",
  );
  expect(upcoming).toHaveLength(1);
  expect(new URL(upcoming[0][0]).searchParams.has("nextDay")).toBe(false);
});

it("defers a confirmed-change reload while Home is covered and fetches its first page on return", async () => {
  // Given: native focus is controlled; all private query and mutation owners stay real.
  await mount(<FollowButton target={team} season={older} />);
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await act(async () => {
    mockFocus.focused = false;
    mockFocus.listeners.forEach((listener) => listener());
  });
  mockFetch.mockClear();

  // When
  await userEvent.press(
    screen.getByRole("button", { name: "Suivre", disabled: false }),
  );
  await screen.findByRole("button", { name: "Suivi", busy: false });

  // Then
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/accounts/${accountId}/matches`,
    ),
  ).toHaveLength(0);

  // When
  await act(async () => {
    mockFocus.focused = true;
    mockFocus.listeners.forEach((listener) => listener());
  });

  // Then
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/accounts/${accountId}/matches`,
    ),
  ).toHaveLength(1);
  expect(
    mockFetch.mock.calls
      .filter(
        ([url]) => new URL(url).pathname === `/accounts/${accountId}/matches`,
      )
      .every(([url]) => !new URL(url).searchParams.has("nextDay")),
  ).toBe(true);
});

it("withdraws a refused calendar after refresh and presents its card without a duplicate toast", async () => {
  // Given
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockImplementation((url, request) =>
    new URL(url).pathname === `/accounts/${accountId}/matches`
      ? Promise.resolve(new Response(null, { status: 404 }))
      : transport(url, request),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("button", { name: "Réessayer" });

  // Then
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
});

it("withdraws obsolete personal rows when a successful continuation establishes no available follows", async () => {
  // Given
  mockFetch.mockImplementation(async (url, request) => {
    const response = await transport(url, request);
    if (new URL(url).pathname !== `/accounts/${accountId}/matches`) {
      return response;
    }
    const first = await response.json();
    return Response.json(
      new URL(url).searchParams.has("nextDay")
        ? {
            hasAvailableFollows: false,
            calendar: { ...first.calendar, days: [] },
          }
        : { ...first, calendar: { ...first.calendar, nextDay: "2026-10-29" } },
    );
  });
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  const match = await screen.findByRole("link", {
    name: /Ouvrir le match Home — Away/,
  });

  // When: native continuation succeeds after the last followed origin becomes unavailable.
  await fireEvent(match, "endReached");

  // Then
  await screen.findByRole("button", {
    name: "Rechercher une équipe ou une poule",
  });
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();
});

it("retains its own calendar projection after an independent match-detail refusal", async () => {
  // Given: only native navigation/focus is controlled; both screen/query owners remain real.
  /** Models the native stack covering Home and returning without unmounting its retained owner. */
  function OpenedMatch() {
    const [open, setOpen] = useState(false);
    useEffect(() => {
      mockPush.mockImplementation(() => {
        mockFocus.focused = false;
        mockFocus.listeners.forEach((listener) => listener());
        setOpen(true);
      });
      mockBack.mockImplementation(() => {
        setOpen(false);
        mockFocus.focused = true;
        mockFocus.listeners.forEach((listener) => listener());
      });
    }, []);
    return open ? <MatchScreen matchId={matchDetail().match.id} /> : null;
  }

  mockFetch.mockImplementation((url, request) =>
    new URL(url).pathname.startsWith("/matches/")
      ? Promise.resolve(new Response(null, { status: 404 }))
      : transport(url, request),
  );
  await mount(<OpenedMatch />);
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  const match = await screen.findByRole("link", {
    name: /Ouvrir le match Home — Away/,
  });

  // When
  await userEvent.press(match);
  await screen.findByRole("button", { name: "Réessayer" });
  await userEvent.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  expect(
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/accounts/${accountId}/matches`,
    ),
  ).toHaveLength(1);
});

it("keeps current absence across previously visited personal categories", async () => {
  // Given
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockImplementation(async (url, request) => {
    const response = await transport(url, request);
    if (new URL(url).pathname !== `/accounts/${accountId}/matches`) {
      return response;
    }
    const body = await response.json();
    return Response.json({
      hasAvailableFollows: false,
      calendar: { ...body.calendar, days: [] },
    });
  });

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByText("Aucun suivi à afficher");
  mockFetch.mockClear();
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));

  // Then
  await screen.findByText("Aucun suivi à afficher");
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("captures the current loading zone when selecting a new personal season", async () => {
  // Given: native Intl owns the zone; retained same-season groups stay unchanged.
  let deviceZone = "Europe/Paris";
  // Install the zone double on native Intl before Router creates its fake-clock formatter wrapper.
  jest.useRealTimers();
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  jest
    .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
    .mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...resolvedOptions.call(this), timeZone: deviceZone };
    });
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  deviceZone = "America/New_York";

  // When
  await userEvent.press(
    screen.getByRole("button", { name: "Saison des suivis" }),
  );
  await userEvent.press(screen.getByRole("radio", { name: newer.label }));
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });

  // Then
  const reads = mockFetch.mock.calls
    .map(([url]) => new URL(url))
    .filter((url) => url.pathname === `/accounts/${accountId}/matches`);
  expect(
    reads.map((url) => [
      url.searchParams.get("seasonId"),
      url.searchParams.get("timeZone"),
    ]),
  ).toEqual([
    [older.id, "Europe/Paris"],
    [newer.id, "America/New_York"],
  ]);
});

it("captures each season category zone on first activation and retains it until refresh", async () => {
  // Given
  let deviceZone = "Europe/Paris";
  // Install the zone double on native Intl before Router creates its fake-clock formatter wrapper.
  jest.useRealTimers();
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  jest
    .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
    .mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...resolvedOptions.call(this), timeZone: deviceZone };
    });
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));
  await userEvent.press(
    screen.getByRole("button", { name: "Saison des suivis" }),
  );
  await userEvent.press(screen.getByRole("radio", { name: newer.label }));
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  deviceZone = "America/New_York";
  mockFetch.mockClear();

  // When: the new season's deferred category makes its first active attempt after travel.
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });

  // Then
  const reads = mockFetch.mock.calls
    .map(([url]) => new URL(url))
    .filter((url) => url.pathname === `/accounts/${accountId}/matches`);
  expect(
    reads.map((url) => [
      url.searchParams.get("seasonId"),
      url.searchParams.get("category"),
      url.searchParams.get("timeZone"),
    ]),
  ).toEqual([[newer.id, "completed", "America/New_York"]]);

  // When: leaving and returning after another move preserves the first active attempt's zone.
  deviceZone = "Asia/Tokyo";
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });

  // Then: returning starts no new traversal; only explicit refresh adopts the current zone.
  expect(
    mockFetch.mock.calls
      .map(([url]) => new URL(url))
      .filter(
        (url) =>
          url.pathname === `/accounts/${accountId}/matches` &&
          url.searchParams.get("category") === "completed",
      )
      .map((url) => url.searchParams.get("timeZone")),
  ).toEqual(["America/New_York"]);

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(
      new URL(
        mockFetch.mock.calls.at(-1)?.[0] ?? "https://example.invalid",
      ).searchParams.get("timeZone"),
    ).toBe("Asia/Tokyo"),
  );
});

it("opens the native season route and returns to Home with the same owner's accepted choice", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));

  // Then
  expect(screen).toHavePathname("/season");
  expect(
    await screen.findByRole("radio", { name: older.label, checked: true }),
  ).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("radio", { name: newer.label }));

  // Then
  expect(screen).toHavePathname("/");
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: newer.label });
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});

it.each(
  [
    ["À venir", "matches"],
    ["Terminés", "matches"],
    ["Suivis", "team-follows"],
    ["Suivis", "pool-follows"],
  ].flatMap(([tab, collection]) =>
    ["catalog", "empty"].map((fallback) => [tab, collection, fallback]),
  ),
)(
  "reconciles a disappeared season after opening the selector following %s/%s failure with %s options",
  async (tab, collection, fallback) => {
    // Given: only HTTP/native I/O are controlled; Home, both lists, F03 calendars and Query are real.
    let withdrawn = false;
    mockFetch.mockImplementation((url, request) => {
      const parsed = new URL(url);
      if (withdrawn && parsed.pathname.endsWith("/follow-options")) {
        return Promise.resolve(
          Response.json(
            fallback === "catalog"
              ? { seasons: [newer], defaultSeasonId: newer.id }
              : { seasons: [] },
          ),
        );
      }
      if (
        withdrawn &&
        parsed.pathname.endsWith(`/${collection}`) &&
        parsed.searchParams.get("seasonId") === older.id
      ) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      if (withdrawn && parsed.searchParams.get("seasonId") !== older.id) {
        if (parsed.pathname.endsWith("/matches")) {
          const envelope: PersonalMatchCalendarResponse = {
            hasAvailableFollows: false,
            calendar: {
              category:
                parsed.searchParams.get("category") === "completed"
                  ? "completed"
                  : "upcoming",
              timeZone: parsed.searchParams.get("timeZone") ?? "Europe/Paris",
              evaluatedAt: "2026-10-28T12:00:00Z",
              days: [],
            },
          };
          return Promise.resolve(Response.json(envelope));
        }
        if (/\/(team|pool)-follows$/.test(parsed.pathname)) {
          return Promise.resolve(Response.json({ items: [] }));
        }
      }
      return transport(url, request);
    });
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await layoutNativeTabs();
    await userEvent.press(screen.getByRole("tab", { name: tab }));
    await screen.findByRole("link", {
      name: tab === "Suivis" ? /Étoile/ : /Ouvrir le match Home — Away/,
    });
    mockFetch.mockClear();

    // When
    withdrawn = true;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then: data failure alone leaves the current selector available and starts no options read.
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });

    // When: the holder uses the existing selector to establish current choices.
    await userEvent.press(
      screen.getByRole("button", { name: "Saison des suivis" }),
    );
    await screen.findByRole("radio", {
      name: fallback === "catalog" ? newer.label : "Toutes les saisons",
    });
    await userEvent.press(screen.getByRole("button", { name: "Fermer" }));

    // Then: successful omission applies the ordinary default to every personal view.
    const label = fallback === "catalog" ? newer.label : "Toutes saisons";
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Saison des suivis" }),
      ).toHaveAccessibilityValue({ text: label }),
    );
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(1);
    mockFetch.mockClear();
    for (const destination of ["À venir", "Terminés", "Suivis"]) {
      await layoutNativeTabs();
      await userEvent.press(screen.getByRole("tab", { name: destination }));
      await screen.findByText("Aucun suivi à afficher");
      expect(
        screen.queryByRole("link", {
          name: /Étoile|Ouvrir le match Home — Away/,
        }),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Saison des suivis" }),
      ).toHaveAccessibilityValue({ text: label });
    }
    const selections = mockFetch.mock.calls.filter(([url]) =>
      /\/(matches|team-follows|pool-follows)\?/.test(url),
    );
    expect(selections.length).toBeGreaterThan(0);
    expect(
      selections.every(
        ([url]) =>
          new URL(url).searchParams.get("seasonId") ===
          (fallback === "catalog" ? newer.id : null),
      ),
    ).toBe(true);
  },
);

it.each(
  [
    ["À venir", "matches"],
    ["Suivis", "team-follows"],
  ].flatMap(([tab, collection]) =>
    ["offered", "failed"].map((outcome) => [tab, collection, outcome]),
  ),
)(
  "retains the season in %s after %s NotFound when options are %s and bounds each explicit retry",
  async (tab, collection, outcome) => {
    // Given
    let refused = false;
    mockFetch.mockImplementation((url, request) => {
      if (refused && new URL(url).pathname.endsWith(`/${collection}`)) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      if (refused && url.endsWith("/follow-options") && outcome === "failed") {
        return Promise.reject(new TypeError("Synthetic options outage"));
      }
      return transport(url, request);
    });
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await layoutNativeTabs();
    await userEvent.press(screen.getByRole("tab", { name: tab }));
    await screen.findByRole("link", {
      name: tab === "Suivis" ? /Étoile/ : /Ouvrir le match Home — Away/,
    });
    if (tab === "Suivis") {
      await userEvent.press(
        screen.getByRole("button", { name: "Poules suivies", expanded: true }),
      );
    }
    mockFetch.mockClear();

    // When
    refused = true;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    const retry = await screen.findByRole("button", { name: "Réessayer" });

    // Then
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(0);
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith(`/${collection}`),
      ),
    ).toHaveLength(1);

    // When: only the user's new attempt rereads the refused collection.
    await userEvent.press(retry);
    await screen.findByRole("button", { name: "Réessayer", busy: false });

    // Then
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(0);
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith(`/${collection}`),
      ),
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });
  },
);

it.each([false, true])(
  "keeps a failed previously empty team list recoverable when the pool list is empty=%s",
  async (emptyPools) => {
    // Given
    let failed = false;
    mockFetch.mockImplementation((url, request) => {
      const pathname = new URL(url).pathname;
      if (pathname === `/accounts/${accountId}/team-follows`) {
        return failed
          ? Promise.reject(new TypeError("Synthetic empty-list outage"))
          : Promise.resolve(Response.json({ items: [] }));
      }
      if (emptyPools && pathname === `/accounts/${accountId}/pool-follows`) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      return transport(url, request);
    });
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
    await screen.findByText("Aucun suivi à afficher");

    // When
    failed = true;
    if (emptyPools) {
      await act(async () => {
        await client.invalidateQueries({
          queryKey: followListKey(
            { accountId, subject: session.subject },
            "team",
            { seasonId: older.id },
          ),
          exact: true,
        });
      });
    } else {
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );
    }

    // Then
    await screen.findByRole("button", { name: "Réessayer" });
    expect(screen.queryByText(TECHNICAL_ERROR)).not.toBeOnTheScreen();
    if (!emptyPools) {
      expect(screen.queryByRole("link", { name: /Poule A/ })).toBeNull();
      expect(
        screen.queryByText("Aucun suivi à afficher"),
      ).not.toBeOnTheScreen();
    }

    // When
    failed = false;
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    await screen.findByText("Aucun suivi à afficher");
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    if (!emptyPools) {
      expect(screen.getByRole("link", { name: /Poule A/ })).toBeOnTheScreen();
    }
  },
);

it("retains pages on append failure, deduplicates UUIDs and keeps homonyms distinguishable", async () => {
  // Given
  let failAppend = true;
  const otherId = "00000000-0000-4000-8000-000000000005";
  const first = {
    team: { id: team.id, name: "Étoile" },
    season: older,
    classification: { format: "6x6" },
    professional: false,
  };
  const second = {
    ...first,
    team: { id: otherId, name: "Étoile" },
    season: newer,
    classification: { format: "4x4" },
  };
  mockFetch.mockImplementation(async (url, request) => {
    if (new URL(url).pathname === `/accounts/${accountId}/pool-follows`) {
      const response = await transport(url, request);
      const page = Number(new URL(url).searchParams.get("page"));
      return Response.json({
        ...(await response.json()),
        ...(page < 2 ? { nextPage: page + 1 } : {}),
      });
    }
    if (new URL(url).pathname !== `/accounts/${accountId}/team-follows`) {
      return transport(url, request);
    }
    const next = new URL(url).searchParams.get("page") === "1";
    if (next && failAppend) {
      return Promise.reject(new TypeError("Synthetic append failure"));
    }
    return Promise.resolve(
      Response.json(
        next ? { items: [first, second] } : { items: [first], nextPage: 1 },
      ),
    );
  });
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  const firstLink = await screen.findByRole("link", {
    name: /Étoile.*2025\/2026.*6 × 6/,
  });

  // When: the native list edge requests the next server page.
  await fireEvent(firstLink, "endReached");
  await screen.findByRole("button", { name: "Réessayer" });

  // Then
  expect(screen.getByRole("link", { name: /Étoile/ })).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: /Poule A/ })).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Équipes suivies" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Poules suivies" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aucun suivi à afficher")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", { name: TECHNICAL_ERROR }),
  ).not.toBeOnTheScreen();

  // When: another native edge may continue the unaffected section, but cannot repeat the failed team page.
  await fireEvent(screen.getByRole("link", { name: /Étoile/ }), "endReached");

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls
        .filter(([url]) => new URL(url).pathname.endsWith("/pool-follows"))
        .map(([url]) => new URL(url).searchParams.get("page")),
    ).toEqual(["0", "1", "2"]),
  );
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(url).pathname.endsWith("/team-follows"))
      .map(([url]) => new URL(url).searchParams.get("page")),
  ).toEqual(["0", "1"]);

  // When
  failAppend = false;
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
  const secondLink = await screen.findByRole("link", {
    name: /Étoile.*2026\/2027.*4 × 4/,
  });
  await userEvent.press(secondLink);

  // Then
  expect(screen.getAllByRole("link", { name: /Étoile/ })).toHaveLength(2);
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/teams/[teamId]",
    params: { teamId: otherId },
  });
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(
        ([url]) =>
          new URL(url).pathname === `/accounts/${accountId}/team-follows`,
      )
      .map(([url]) => new URL(url).searchParams.get("page")),
  ).toEqual(["0", "1", "1"]);
});

it("retains populated Following on return and defers mutation resets while Home is covered", async () => {
  // Given
  await mount(<FollowButton target={team} season={older} />);
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  await screen.findByRole("link", { name: /Étoile/ });
  await act(async () => {
    mockFocus.focused = false;
    mockFocus.listeners.forEach((listener) => listener());
  });
  mockFetch.mockClear();

  // When: an ordinary detail return leaves both collections populated.
  await act(async () => {
    mockFocus.focused = true;
    mockFocus.listeners.forEach((listener) => listener());
  });

  // Then
  expect(screen.getByRole("link", { name: /Étoile/ })).toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();

  // When: the existing follow mutation owner resets the covered collections.
  await act(async () => {
    mockFocus.focused = false;
    mockFocus.listeners.forEach((listener) => listener());
  });
  await userEvent.press(
    screen.getByRole("button", { name: "Suivre", disabled: false }),
  );
  await screen.findByRole("button", { name: "Suivi", busy: false });

  // Then
  expect(
    mockFetch.mock.calls.filter(([url]) => /\/(team|pool)-follows\?/.test(url)),
  ).toHaveLength(0);

  // When
  await act(async () => {
    mockFocus.focused = true;
    mockFocus.listeners.forEach((listener) => listener());
  });
  await screen.findByRole("link", { name: /Étoile/ });
  await screen.findByRole("link", { name: /Poule A/ });

  // Then
  expect(
    mockFetch.mock.calls
      .filter(([url]) => /\/(team|pool)-follows\?/.test(url))
      .map(([url]) => new URL(url).searchParams.get("page")),
  ).toEqual(["0", "0"]);
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
});

it("shares All seasons across both lists and offers Search only after successful empty reads", async () => {
  // Given
  mockFetch.mockImplementation((url, request) =>
    /\/(team|pool)-follows\?/.test(url)
      ? Promise.resolve(Response.json({ items: [] }))
      : transport(url, request),
  );
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await userEvent.press(
    screen.getByRole("button", { name: "Saison des suivis" }),
  );
  await userEvent.press(
    screen.getByRole("radio", { name: "Toutes les saisons" }),
  );
  mockFetch.mockClear();

  // When
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  await userEvent.press(
    await screen.findByRole("button", {
      name: "Rechercher une équipe ou une poule",
    }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith("/search");
  const reads = mockFetch.mock.calls.filter(([url]) =>
    /\/(team|pool)-follows\?/.test(url),
  );
  expect(reads).toHaveLength(2);
  expect(
    reads.every(([url]) => !new URL(url).searchParams.has("seasonId")),
  ).toBe(true);
  expect(screen.queryByRole("button", { name: "Suivi" })).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
});

it.each(["team", "pool"] as const)(
  "retains Following during a delayed pull after a failed %s continuation and keeps the final card through Retry",
  async (type) => {
    // Given: real Query keeps the accepted collection after its next page fails.
    mockFetch.mockImplementation(async (url, request) => {
      const parsed = new URL(url);
      if (!parsed.pathname.endsWith(`/${type}-follows`)) {
        return transport(url, request);
      }
      if (parsed.searchParams.get("page") === "1") {
        throw new TypeError("Synthetic continuation outage");
      }
      const response = await transport(url, request);
      return Response.json({ ...(await response.json()), nextPage: 1 });
    });
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
    await screen.findByRole("link", { name: /Étoile/ });
    await screen.findByRole("link", { name: /Poule A/ });
    await fireEvent(screen.getByRole("link", { name: /Étoile/ }), "endReached");
    await screen.findByRole("button", { name: "Réessayer" });
    const refreshRead = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url, request) =>
      new URL(url).pathname.endsWith(`/${type}-follows`)
        ? refreshRead.promise
        : transport(url, request),
    );

    // When: a full native pull waits for its actual first-page response.
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then: the retained continuation error does not replace content while that pull is active.
    await waitFor(() =>
      expect(screen.getByLabelText("Actualiser les données")).toBeBusy(),
    );
    expect(screen.getByRole("link", { name: /Étoile/ })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: /Poule A/ })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Équipes suivies" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Poules suivies" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
    ).toBeNull();

    // When: that full read actually fails.
    await act(() => refreshRead.resolve(Response.json({}, { status: 503 })));
    await screen.findByRole("alert", { name: TECHNICAL_ERROR_TITLE });
    const retryRead = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url, request) =>
      new URL(url).pathname.endsWith(`/${type}-follows`)
        ? retryRead.promise
        : transport(url, request),
    );
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then: card Retry keeps its card rather than restoring the previous rows while pending.
    expect(
      screen.getByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByRole("button", { name: "Réessayer", busy: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: /Étoile/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Poule A/ })).toBeNull();
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

    // When: explicit card recovery succeeds through the same collection's real transport schema.
    const recovered = await transport(
      `https://api.example.invalid/accounts/${accountId}/${type}-follows`,
    );
    await act(() => retryRead.resolve(recovered));

    // Then
    expect(
      await screen.findByRole("link", { name: /Étoile/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: /Poule A/ })).toBeOnTheScreen();
    expect(
      screen.queryByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
    ).toBeNull();
  },
);

it.each(["team", "pool"] as const)(
  "shows one Following card when the %s refresh fails before the other collection",
  async (first) => {
    // Given
    const teamRead = Promise.withResolvers<Response>();
    const poolRead = Promise.withResolvers<Response>();
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
    await screen.findByRole("link", { name: /Étoile/ });
    await screen.findByRole("link", { name: /Poule A/ });
    mockFetch.mockClear().mockImplementation((url, request) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/team-follows")) {
        return teamRead.promise;
      }
      if (path.endsWith("/pool-follows")) {
        return poolRead.promise;
      }
      return transport(url, request);
    });

    try {
      // When: a paused pull keeps content without announcing active native progress.
      await act(() => onlineManager.setOnline(false));
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );
      expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
      expect(screen.getByRole("link", { name: /Étoile/ })).toBeOnTheScreen();
      expect(mockFetch).not.toHaveBeenCalled();

      // When: Query resumes its same reads online.
      await act(() => onlineManager.setOnline(true));
      await waitFor(() =>
        expect(screen.getByLabelText("Actualiser les données")).toBeBusy(),
      );
      await act(async () =>
        (first === "team" ? teamRead : poolRead).reject(
          new TypeError("Unavailable"),
        ),
      );
      await screen.findByRole("button", { name: "Réessayer", busy: false });
      // The sibling read remains Query-owned; its pending operation is not a card click.
      expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
      expect(screen.queryByRole("link", { name: /Étoile/ })).toBeNull();
      expect(screen.queryByRole("link", { name: /Poule A/ })).toBeNull();
      await act(async () =>
        (first === "team" ? poolRead : teamRead).reject(
          new TypeError("Unavailable"),
        ),
      );
      await waitFor(() => expect(client.isFetching()).toBe(0));

      // Then
      expect(announce).not.toHaveBeenCalled();
      expect(screen.getAllByRole("button", { name: "Réessayer" })).toHaveLength(
        1,
      );
      expect(
        screen.getByRole("button", { name: "Saison des suivis" }),
      ).toHaveAccessibilityValue({ text: older.label });
      expect(
        mockFetch.mock.calls.every(
          ([, request]) => !request?.method || request.method === "GET",
        ),
      ).toBe(true);
    } finally {
      await act(async () => {
        onlineManager.setOnline(true);
        teamRead.resolve(Response.json({ items: [] }));
        poolRead.resolve(Response.json({ items: [] }));
      });
    }
  },
);

it("retries a failed Following refresh from its card before reopening native continuation", async () => {
  // Given
  let unavailable = false;
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  mockFetch.mockImplementation(async (url, request) => {
    if (new URL(url).pathname !== `/accounts/${accountId}/team-follows`) {
      return transport(url, request);
    }
    if (unavailable) {
      throw new TypeError("Synthetic refresh outage");
    }
    const response = await transport(url, request);
    return Response.json({ ...(await response.json()), nextPage: 1 });
  });
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  await screen.findByRole("link", { name: /Étoile/ });
  unavailable = true;

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("button", { name: "Réessayer" });

  // Then
  expect(screen.queryByRole("link", { name: /Étoile/ })).toBeNull();
  expect(announce).not.toHaveBeenCalled();

  // When: a second failed card attempt retains the same scope without publishing a toast.
  announce.mockClear();
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /Étoile/ })).toBeNull();
  expect(announce).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/pool-follows"),
    ),
  ).toHaveLength(2);

  // When: successful card recovery reopens native continuation.
  unavailable = false;
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen(),
  );
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/pool-follows"),
    ),
  ).toHaveLength(2);
  mockFetch.mockClear();
  await fireEvent(screen.getByRole("link", { name: /Étoile/ }), "endReached");

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(
        ([url]) => new URL(url).searchParams.get("page") === "1",
      ),
    ).toBe(true),
  );
});

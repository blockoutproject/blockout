import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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
import { View } from "react-native";
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
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import {
  AccountSessionProvider,
  useAccountSession,
  type AccountSession,
} from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
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
      if (href === "/season")
        jest.requireActual("expo-router").router.push(href);
    },
    back: () => {
      mockBack();
      const router = jest.requireActual("expo-router").router;
      if (router.canGoBack()) router.back();
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
  () =>
    jest.requireActual("react-native-safe-area-context/src/jest/mock").default,
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
const profile = {
  accountId,
  username: "Synthetic",
  email: "synthetic@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: {
    manageMaintenance: false,
    manageApplicationVersions: false,
    bypassMaintenance: false,
    manageSportingPresentation: false,
    manageSportingClassification: false,
    manageDivisionLifecycle: false,
    manageCollection: false,
    moderateStreamLinks: false,
  },
};
const environment = { ...process.env };
let publicClient = createQueryClient();
let client = publicClient;
let clients = new Set([publicClient]);
let session: AccountSession;
let proposed = older;
let following = false;

/** Uses the root's real private-query cleanup; native identity/inset I/O and HTTP are controlled. */
function SessionBinding({ children }: PropsWithChildren) {
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

/** Synthetic current-owner HTTP responses go through the actual generated validation. */
async function transport(url: string, request?: RequestInit) {
  if (url.endsWith("/application-access"))
    return Response.json(applicationAccessResponse());
  if (url.endsWith("/accounts/me")) return Response.json(profile);
  if (url.includes("follow-options"))
    return Response.json({
      seasons: [newer, older],
      defaultSeasonId: proposed.id,
    });
  if (new URL(url).pathname === `/accounts/${accountId}/team-follows`)
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
  if (new URL(url).pathname === `/accounts/${accountId}/pool-follows`)
    return Response.json({
      items: [
        {
          pool: { id: newer.id, name: "Poule A" },
          season: older,
          classification: {},
        },
      ],
    });
  if (new URL(url).pathname === `/accounts/${accountId}/matches`)
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
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  await layoutNativeTabs();
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
  for (const cache of clients) cache.clear();
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

  await layoutNativeTabs();

  // When
  await user.press(screen.getByRole("tab", { name: "Suivis" }));
  await layoutNativeTabs();
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
  await user.press(screen.getByRole("tab", { name: "Suivis" }));
  await layoutNativeTabs();

  // Then: each failed collection keeps its own explicit retry, with no false empty state.
  expect(
    await screen.findAllByRole("button", { name: "Réessayer" }),
  ).toHaveLength(2);
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

it("keeps current choices after a failed explicit refresh and offers the next opening as retry", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );
  mockFetch.mockImplementation((url, request) =>
    url.includes("follow-options")
      ? Promise.reject(new TypeError("Synthetic network failure"))
      : transport(url, request),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));

  // Then
  await screen.findByRole("radio", { name: older.label, checked: true });
  await screen.findByRole("alert");
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => url.includes("follow-options"))
        .length,
    ).toBe(2),
  );
  expect(screen.getByRole("radio", { name: newer.label })).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => url.includes("follow-options"))
        .length,
    ).toBe(3),
  );
});

it("removes the personal selector when its actual session signs out and uses the shared invitation", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );

  const originalClient = client;

  // When
  await act(async () => session.signOut());
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  expect(
    screen.queryByRole("button", { name: "Saison des suivis" }),
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
    if (url.includes("/clubs/") && url.includes("/teams"))
      return Promise.resolve(Response.json({ seasonId: older.id, items: [] }));
    if (url.includes("/clubs/"))
      return Promise.resolve(
        Response.json({ ...clubDetail(), seasons: [older, newer] }),
      );
    if (url.includes("/sporting-search-options?"))
      return Promise.resolve(
        Response.json({
          resourceType: new URL(url).searchParams.get("resourceType"),
          seasons: [older],
          divisions: [],
          formats: ["6x6", "4x4", "2x2"],
          genders: ["female", "male", "mixed"],
        }),
      );
    if (url.includes("/teams?"))
      return Promise.resolve(Response.json({ teams: [] }));
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
  const clubTeams = await within(
    screen.getByLabelText("Public club"),
  ).findByRole("tab", { name: "Équipes" });
  await layoutNativeTabs();
  await user.press(clubTeams);
  await screen.findByRole("button", { name: `Saison ${older.label}` });
  await user.type(screen.getByLabelText("Rechercher"), "Volleyball");
  await screen.findByText("Aucun résultat pour ces critères");

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  await user.press(screen.getByRole("radio", { name: newer.label }));

  // Then
  expect(
    screen.getByRole("button", { name: `Saison ${older.label}` }),
  ).toBeOnTheScreen();
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

it("distinguishes an initial options failure from successful empty options and retries the read", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, request) =>
    url.includes("follow-options")
      ? Promise.reject(new TypeError("Synthetic network failure"))
      : transport(url, request),
  );
  await mount();

  // Then
  await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
  ).toHaveAccessibilityValue({ text: "Saison" });

  // When
  mockFetch.mockImplementation((url, request) =>
    url.includes("follow-options")
      ? Promise.resolve(Response.json({ seasons: [] }))
      : transport(url, request),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", {
        name: "Saison des suivis",
        disabled: false,
      }),
    ).toHaveAccessibilityValue({ text: "Toutes saisons" }),
  );
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
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
    await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
    await user.press(screen.getByRole("radio", { name: newer.label }));
    mockFetch.mockImplementation((url, request) =>
      url.includes("follow-options")
        ? Promise.resolve(new Response(null, { status }))
        : transport(url, request),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Saison des suivis" }));

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
  await layoutNativeTabs();

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

it("retains encounters after an ordinary failed pull but withdraws them after a confirmed follow change fails to reload", async () => {
  // Given
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

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert");

  // Then
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();

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
});

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
            date: "2026-10-20",
            pools: [
              {
                poolId: team.id,
                matches: [
                  {
                    ...match,
                    id,
                    category,
                    schedule: { ...match.schedule, localDate: "2026-10-20" },
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
    if (request?.method === "PUT") changed = true;
    if (!parsed.pathname.endsWith("/matches")) return transport(url, request);
    if (changed) return Promise.resolve(calendar(url, replacement, "Current"));
    if (parsed.searchParams.get("nextDay") === "2026-10-19")
      return late.promise;
    return Promise.resolve(
      parsed.searchParams.has("nextDay")
        ? calendar(url, oldSecond, "Second", "2026-10-19")
        : calendar(url, matchDetail().match.id, "First", "2026-10-20"),
    );
  });
  await mount(<FollowButton target={team} season={older} />);
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await layoutNativeTabs();
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
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));
  await layoutNativeTabs();
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
    if (new URL(url).pathname !== `/accounts/${accountId}/matches`)
      return response;
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
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockImplementation(async (url, request) => {
    const response = await transport(url, request);
    if (new URL(url).pathname !== `/accounts/${accountId}/matches`)
      return response;
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
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));
  await layoutNativeTabs();

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

it("keeps the mounted category zone until its ordinary refresh", async () => {
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
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await userEvent.press(screen.getByRole("tab", { name: "À venir" }));
  await layoutNativeTabs();
  await userEvent.press(
    screen.getByRole("button", { name: "Saison des suivis" }),
  );
  await userEvent.press(screen.getByRole("radio", { name: newer.label }));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  deviceZone = "America/New_York";
  mockFetch.mockClear();

  // When: the already-mounted category has no loaded traversal for the new season yet.
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await layoutNativeTabs();
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
  ).toEqual([[newer.id, "completed", "Europe/Paris"]]);
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() =>
    expect(
      new URL(
        mockFetch.mock.calls.at(-1)?.[0] ?? "https://example.invalid",
      ).searchParams.get("timeZone"),
    ).toBe("America/New_York"),
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
  "reconciles a disappeared season from %s's actual %s consumer with %s options across all personal views",
  async (tab, collection, fallback) => {
    // Given: only HTTP/native I/O are controlled; Home, both lists, F03 calendars and Query are real.
    let withdrawn = false;
    mockFetch.mockImplementation((url, request) => {
      const parsed = new URL(url);
      if (withdrawn && parsed.pathname.endsWith("/follow-options"))
        return Promise.resolve(
          Response.json(
            fallback === "catalog"
              ? { seasons: [newer], defaultSeasonId: newer.id }
              : { seasons: [] },
          ),
        );
      if (
        withdrawn &&
        parsed.pathname.endsWith(`/${collection}`) &&
        parsed.searchParams.get("seasonId") === older.id
      )
        return Promise.resolve(new Response(null, { status: 404 }));
      return transport(url, request);
    });
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await userEvent.press(screen.getByRole("tab", { name: tab }));
    await layoutNativeTabs();
    await screen.findByRole("link", {
      name: tab === "Suivis" ? /Étoile/ : /Ouvrir le match Home — Away/,
    });
    mockFetch.mockClear();

    // When
    withdrawn = true;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then: one successful options omission selects the default, then every real tab shares it.
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
      await userEvent.press(screen.getByRole("tab", { name: destination }));
      await layoutNativeTabs();
      await screen.findByRole("link", {
        name:
          destination === "Suivis" ? /Étoile/ : /Ouvrir le match Home — Away/,
      });
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

it.each(["offered", "failed"])(
  "retains the season after a real calendar NotFound when options are %s and bounds each explicit retry",
  async (outcome) => {
    // Given
    let refused = false;
    mockFetch.mockImplementation((url, request) => {
      if (refused && new URL(url).pathname.endsWith("/matches"))
        return Promise.resolve(new Response(null, { status: 404 }));
      if (refused && url.endsWith("/follow-options") && outcome === "failed")
        return Promise.reject(new TypeError("Synthetic options outage"));
      return transport(url, request);
    });
    await mount();
    await screen.findByRole("button", {
      name: "Saison des suivis",
      disabled: false,
    });
    await layoutNativeTabs();
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
    mockFetch.mockClear();

    // When
    refused = true;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await screen.findByRole("button", { name: "Réessayer" });

    // Then
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(1);
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/matches"),
      ),
    ).toHaveLength(1);

    // When: only the user's new attempt may recheck uncertainty.
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByRole("button", { name: "Réessayer", busy: false });

    // Then
    expect(
      mockFetch.mock.calls.filter(([url]) => url.endsWith("/follow-options")),
    ).toHaveLength(2);
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/matches"),
      ),
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label });
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
  mockFetch.mockImplementation((url, request) => {
    if (new URL(url).pathname !== `/accounts/${accountId}/team-follows`)
      return transport(url, request);
    const next = new URL(url).searchParams.get("page") === "1";
    if (next && failAppend)
      return Promise.reject(new TypeError("Synthetic append failure"));
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
  await layoutNativeTabs();
  const firstLink = await screen.findByRole("link", {
    name: /Étoile.*2025\/2026.*6 × 6/,
  });

  // When: the native list edge requests the next server page.
  await fireEvent(firstLink, "endReached");
  await screen.findByRole("button", { name: "Réessayer" });

  // Then
  expect(screen.getAllByRole("link", { name: /Étoile/ })).toHaveLength(1);
  expect(screen.queryByText("Aucun suivi à afficher")).not.toBeOnTheScreen();

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
  await layoutNativeTabs();
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
  await userEvent.press(screen.getByRole("tab", { name: "Suivis" }));
  await layoutNativeTabs();
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
});

it("keeps an explicit read retry at the list edge after a failed first-page refresh", async () => {
  // Given
  let unavailable = false;
  mockFetch.mockImplementation(async (url, request) => {
    if (new URL(url).pathname !== `/accounts/${accountId}/team-follows`)
      return transport(url, request);
    if (unavailable) throw new TypeError("Synthetic refresh outage");
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
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Étoile/ });
  unavailable = true;

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("button", { name: "Réessayer" });

  // Then
  expect(screen.getByRole("link", { name: /Étoile/ })).toBeOnTheScreen();

  // When: retry belongs to the failed refresh; successful recovery reopens native continuation.
  unavailable = false;
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen(),
  );
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

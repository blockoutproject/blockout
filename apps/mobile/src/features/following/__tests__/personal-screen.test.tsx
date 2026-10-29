import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { QueryClientProvider } from "@tanstack/react-query";
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
import {
  createQueryClient,
  bindSessionQueries,
} from "../../../shared/query/query-client";
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
let client = createQueryClient();
let session: AccountSession;
let proposed = older;

/** Uses the root's real private-query cleanup; native identity/inset I/O and HTTP are controlled. */
function SessionBinding({ children }: PropsWithChildren) {
  const current = useAccountSession();
  useEffect(() => {
    session = current;
  }, [current]);
  useEffect(
    () => bindSessionQueries(client, current.subscribe, current.isCurrent),
    [current.subscribe, current.isCurrent],
  );
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
          <QueryClientProvider client={client}>
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
    return Response.json({ following: true });
  }
  return Response.json({ following: false });
}

beforeEach(() => {
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  client = createQueryClient();
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
  mockFocus.focused = true;
});
afterEach(async () => {
  await cleanup();
  client.clear();
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

it("shows unavailable follows without inventing a read and retains the accepted personal calendar", async () => {
  // Given: Home has an accepted calendar and season, while follow lists remain undelivered.
  const user = userEvent.setup();
  await mount();
  await screen.findByRole("button", {
    name: "Saison des suivis",
    disabled: false,
  });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockClear();

  // When
  await user.press(screen.getByRole("tab", { name: "Suivis" }));
  await layoutNativeTabs();

  // Then: unavailable content neither claims successful emptiness nor offers an invented recovery.
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  expect(screen.queryByText("Aucun suivi à afficher")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Suivis", selected: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Saison des suivis", disabled: false }),
  ).toHaveAccessibilityValue({ text: older.label });
  expect(mockFetch).not.toHaveBeenCalled();

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

  const originalGeneration = session.generation;

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
  expect(
    client
      .getQueryCache()
      .getAll()
      .filter(
        (query) =>
          query.queryKey[0] === "session" &&
          query.queryKey[1] === originalGeneration,
      ),
  ).toHaveLength(0);
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

it("keeps authorized encounters after an ordinary failed pull and removes them after a failed changed-follow reload", async () => {
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

it("returns from a refused actual match screen without exposing its retained personal card", async () => {
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
  await screen.findByText("Aucun match pour cette sélection");
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();
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

it("captures the loading zone at first activation of an inactive new-season category", async () => {
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
  ).toEqual([[newer.id, "completed", "America/New_York"]]);
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

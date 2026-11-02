import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
  PropsWithChildren,
} from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import "../../../shared/native/test-support/tab-view-native";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { AppState, Dimensions, View } from "react-native";
import { PagedTabs } from "../../../shared/components/paged-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type {
  MatchCalendarResponse,
  MatchSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  clubDetail,
  matchDetail,
  sportingId,
} from "../test-support/consultation-data";
import { CalendarMatch } from "../components/calendar-match";
import { SportingCalendar } from "../components/sporting-calendar";
import { TeamScreen } from "../screens/team-screen";
import { ClubScreen } from "../screens/club-screen";

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
  useNavigation: () => ({ isFocused: () => mockFocused }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
let mockFocused = true;
const environment = { ...process.env };
let client: QueryClient;
let publicClient = createQueryClient();
let calendar: MatchCalendarResponse;

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
  mockFetch.mockReset();
  mockPush.mockReset();
  mockFocused = true;
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  calendar = {
    category: "upcoming",
    timeZone: "Europe/Paris",
    evaluatedAt: "2026-09-19T12:00:00Z",
    days: [
      {
        date: "2026-09-20",
        pools: [{ poolId: sportingId, matches: [matchDetail().match] }],
      },
    ],
  };
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json(
        new URL(url).pathname.endsWith("/application-access")
          ? applicationAccessResponse()
          : calendar,
      ),
    ),
  );
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  jest.restoreAllMocks();
  process.env = { ...environment };
});

/** Actual theme, access, session and cache; only native identity and HTTP are controlled. */
function Providers({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <QueryClientProvider client={publicClient}>
          <ThemeProvider>
            <ActionFeedbackProvider scopeKey="test">
              <ApplicationAccessProvider>
                <AccountSessionProvider>
                  <PrivateQueries>
                    <AdvertisingProviders>{children}</AdvertisingProviders>
                  </PrivateQueries>
                </AccountSessionProvider>
              </ApplicationAccessProvider>
            </ActionFeedbackProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Supplies resource screens' real scene ownership for a calendar-only scenario. */
function CalendarTab({ children }: PropsWithChildren) {
  return (
    <PagedTabs
      selected="calendar"
      onSelect={() => undefined}
      tabs={[{ id: "calendar", label: "Calendrier", content: children }]}
    />
  );
}

/** Supplies a completed native swipe sequence; shared production code decides platform settlement. */
async function settleNativePage(position: number) {
  const pager = screen.getByTestId("native-tabs-pager");
  await fireEvent(pager, "pageSelected", { nativeEvent: { position } });
  await fireEvent(pager, "pageScroll", {
    nativeEvent: { position, offset: 0 },
  });
  await fireEvent(pager, "pageScrollStateChanged", {
    nativeEvent: { pageScrollState: "idle" },
  });
}

it.each([
  [undefined, "Résultat indisponible"],
  [
    {
      state: "provisional",
      homeSets: 1,
      awaySets: 0,
      observedAt: "2026-09-19T12:00:00Z",
    },
    "Résultat définitif indisponible",
  ],
  [
    {
      state: "unconfirmed",
      specialLabel: "Forfait à confirmer",
      observedAt: "2026-09-19T12:00:00Z",
    },
    "Résultat définitif indisponible",
  ],
] as const)(
  "explains a completed result without inventing a score or sporting finality: %j",
  async (result, label) => {
    // Given
    const match: MatchSummaryResponse = {
      ...matchDetail().match,
      category: "completed",
      ...(result ? { result } : {}),
    };

    // When
    await render(
      <CalendarMatch match={match} displayTimeZone="Europe/Paris" />,
      { wrapper: Providers },
    );

    // Then
    expect(
      screen.getByRole("link", { name: new RegExp(label) }),
    ).toBeOnTheScreen();
    if (!result || !("homeSets" in result))
      expect(screen.queryByText("0")).not.toBeOnTheScreen();
  },
);

it("opens the exact match while keeping final special notation and supplied totals", async () => {
  // Given
  const match: MatchSummaryResponse = {
    ...matchDetail().match,
    category: "completed",
    result: {
      state: "final",
      homeSets: 3,
      awaySets: 0,
      specialLabel: "Forfait",
      observedAt: "2026-09-19T12:00:00Z",
    },
  };
  await render(<CalendarMatch match={match} displayTimeZone="Europe/Paris" />, {
    wrapper: Providers,
  });

  // When
  await userEvent.press(
    screen.getByRole("link", {
      name: /Ouvrir le match Home — Away, 3 à 0, Forfait/,
    }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: sportingId },
  });
  expect(screen.getByText("Forfait")).toBeOnTheScreen();
  expect(screen.queryByText("Résultat indisponible")).not.toBeOnTheScreen();
});

it("retains loaded calendar data and its active context through native font-size changes without a reread", async () => {
  // Given: native metrics and the real calendar owner; Legend's geometry remains native evidence.
  const original = {
    window: Dimensions.get("window"),
    screen: Dimensions.get("screen"),
  };
  try {
    await act(async () => {
      Dimensions.set({
        window: { ...original.window, fontScale: 1 },
        screen: { ...original.screen, fontScale: 1 },
      });
    });
    await render(
      <CalendarTab>
        <SportingCalendar
          selection={{ teamId: sportingId, category: "upcoming" }}
        />
      </CalendarTab>,
      { wrapper: Providers },
    );
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });

    // When: the native Dimensions change event enters the stacked layout, then restores ordinary text.
    for (const fontScale of [1.7, 1]) {
      await act(async () => {
        Dimensions.set({
          window: { ...original.window, fontScale },
          screen: { ...original.screen, fontScale },
        });
      });

      // Then: data and current-tab actions stay usable throughout both transitions.
      expect(
        screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("tab", { name: "Calendrier", selected: true }),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText("Actualiser les données")).toBeEnabled();
    }
    const reads = mockFetch.mock.calls
      .map(([url]) => new URL(url))
      .filter((url) => url.pathname === "/matches");
    expect(reads).toHaveLength(1);
    expect(reads[0].searchParams.get("teamId")).toBe(sportingId);
    expect(reads[0].searchParams.get("category")).toBe("upcoming");
  } finally {
    // Restore global native metrics even if an assertion fails; other scenarios own their viewport.
    await act(async () => Dimensions.set(original));
  }
});

it("retains calendar rows with one toast after refresh failure and replaces them only after a successful pull", async () => {
  // Given
  await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/application-access")
      ? Promise.resolve(Response.json(applicationAccessResponse()))
      : Promise.resolve(Response.json({}, { status: 503 })),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert", { name: /Une erreur est survenue/ });

  // Then
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: /Réessayer/ }),
  ).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json(
        new URL(url).pathname.endsWith("/application-access")
          ? applicationAccessResponse()
          : { ...calendar, days: [] },
      ),
    ),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await screen.findByText("Aucun match pour cette sélection");
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();
});

it("keeps pagination unavailable while a successful first-page replacement is pending", async () => {
  // Given
  calendar = { ...calendar, nextDay: "2026-09-20" };
  await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  const refreshed = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(refreshed.promise);

  // When: native pull-to-refresh is not expressible through userEvent.
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await fireEvent(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
    "endReached",
  );
  expect(
    screen.queryByRole("button", { name: "Charger les journées suivantes" }),
  ).not.toBeOnTheScreen();
  await act(async () => {
    refreshed.resolve(
      Response.json({ ...calendar, days: [], nextDay: undefined }),
    );
  });
  await screen.findByText("Aucun match pour cette sélection");
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === "/matches",
    ),
  ).toHaveLength(2);
});

it("selects normal new-zone loading and error before an explicit retry", async () => {
  // Given
  let deviceZone = "Europe/Paris";
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  jest
    .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
    .mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...resolvedOptions.call(this), timeZone: deviceZone };
    });
  await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockClear().mockReturnValue(pending.promise);
  deviceZone = "America/New_York";

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("progressbar", { name: "Chargement en cours" }),
  ).toBeOnTheScreen();

  // When
  await act(async () => pending.resolve(Response.json({}, { status: 500 })));

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation(async () =>
    Response.json({ ...calendar, timeZone: deviceZone, days: [] }),
  );
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await screen.findByText("Aucun match pour cette sélection");
  expect(
    mockFetch.mock.calls.map(([url]) => [
      new URL(url).searchParams.get("timeZone"),
      new URL(url).searchParams.get("nextDay"),
    ]),
  ).toEqual([
    ["America/New_York", null],
    ["America/New_York", null],
  ]);
});

it("reports a failed active cursor and retries the same boundary from its footer", async () => {
  // Given: two complete days arrive through the real Query owner, with a controlled continuation failure.
  calendar = { ...calendar, nextDay: "2026-09-21" };
  const nextMatch = {
    ...matchDetail().match,
    id: "00000000-0000-4000-8000-000000000002",
    away: { ...matchDetail().match.away, name: "Next opponent" },
  };
  let failNext = true;
  mockFetch.mockImplementation((url: string) => {
    const target = new URL(url);
    if (target.pathname.endsWith("/application-access"))
      return Promise.resolve(Response.json(applicationAccessResponse()));
    if (!target.searchParams.has("nextDay") && failNext)
      return Promise.resolve(Response.json(calendar));
    if (failNext) return Promise.reject(new TypeError("offline"));
    return Promise.resolve(
      Response.json({
        ...calendar,
        nextDay: undefined,
        days: [
          {
            date: "2026-09-21",
            pools: [{ poolId: sportingId, matches: [nextMatch] }],
          },
        ],
      }),
    );
  });
  await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockClear();

  // When
  await fireEvent(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
    "endReached",
  );
  await screen.findByRole("button", {
    name: "Réessayer",
  });
  await fireEvent(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
    "endReached",
  );

  // Then: the toast reports the failure while rows and explicit retry remain; no automatic retry runs.
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();

  // When
  failNext = false;
  await userEvent.press(screen.getByRole("button", { name: /Réessayer/ }));
  await screen.findByRole("link", { name: /Home — Next opponent/ });
  await fireEvent(
    screen.getByRole("link", { name: /Home — Next opponent/ }),
    "endReached",
  );

  // Then: retry uses the same cursor, and exhaustion sends no extra request or normal load button.
  expect(
    mockFetch.mock.calls.map(([url]) =>
      new URL(url).searchParams.get("nextDay"),
    ),
  ).toEqual(["2026-09-21", "2026-09-21"]);
  expect(
    screen.queryByRole("button", { name: /Réessayer/ }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Charger les journées suivantes" }),
  ).not.toBeOnTheScreen();
});

it("does not append from a covered or inactive calendar", async () => {
  // Given: two complete days arrive through the real Query owner, with a controlled continuation failure.
  calendar = { ...calendar, nextDay: "2026-09-21" };
  mockFetch.mockImplementation(async (url: string) =>
    new URL(url).pathname.endsWith("/application-access")
      ? Response.json(applicationAccessResponse())
      : Response.json(calendar),
  );
  const view = await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockClear();

  // When: the route is covered while its selected calendar stays mounted.
  mockFocused = false;
  await fireEvent(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
    "endReached",
  );

  // Then
  expect(mockFetch).not.toHaveBeenCalled();
  mockFocused = true;

  // When: a retained but inactive calendar receives a native end-of-list event.
  await view.rerender(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
        active={false}
      />
    </CalendarTab>,
  );
  await fireEvent(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
    "endReached",
  );

  // Then
  expect(mockFetch).not.toHaveBeenCalled();

  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).searchParams.has("nextDay"),
    ),
  ).toHaveLength(0);
});

it("keeps a delayed cursor failure in its original scene after departure", async () => {
  // Given: the real calendar owner has usable rows and a pending continuation.
  calendar = { ...calendar, nextDay: "2026-09-21" };
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) => {
    const target = new URL(url);
    if (target.pathname.endsWith("/application-access"))
      return Promise.resolve(Response.json(applicationAccessResponse()));
    return target.searchParams.has("nextDay")
      ? pending.promise
      : Promise.resolve(Response.json(calendar));
  });
  const view = await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockClear();
  await fireEvent(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
    "endReached",
  );
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

  // When: the scene remains mounted but loses selection before its request fails.
  await view.rerender(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
        active={false}
      />
    </CalendarTab>,
  );
  await act(async () => pending.resolve(Response.json({}, { status: 503 })));
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await screen.findByRole("button", { name: "Réessayer" });

  // Then: authorized rows/cursor retry remain local, with no toast over the new context.
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  await userEvent.press(
    await screen.findByRole("button", { name: "Réessayer" }),
  );
  expect(
    mockFetch.mock.calls
      .map(([url]) => new URL(url))
      .filter((url) => url.pathname === "/matches")
      .map((url) => url.searchParams.get("nextDay")),
  ).toEqual(["2026-09-21"]);
  expect(
    screen.queryByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeNull();
});

it("keeps a pending former selection refresh outside the newly selected calendar", async () => {
  // Given: another retained observer keeps the original read alive when the visible selection changes.
  const nextTeam = "00000000-0000-4000-8000-000000000009";
  const pending = Promise.withResolvers<Response>();
  const started = Promise.withResolvers<void>();
  let holdOriginal = false;
  const nextCalendar = {
    ...calendar,
    days: [
      {
        ...calendar.days[0],
        pools: [
          {
            ...calendar.days[0].pools[0],
            matches: [
              {
                ...matchDetail().match,
                home: { id: nextTeam, name: "Current team" },
              },
            ],
          },
        ],
      },
    ],
  };
  mockFetch.mockImplementation((url: string) => {
    const target = new URL(url);
    if (target.pathname.endsWith("/application-access"))
      return Promise.resolve(Response.json(applicationAccessResponse()));
    if (target.searchParams.get("teamId") === nextTeam)
      return Promise.resolve(Response.json(nextCalendar));
    if (holdOriginal) {
      started.resolve();
      return pending.promise;
    }
    return Promise.resolve(Response.json(calendar));
  });
  /** A covered, retained observer uses the same real Query resource as the visible original scene. */
  function calendars(teamId: string) {
    return (
      <>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <SportingCalendar
            selection={{ teamId: sportingId, category: "upcoming" }}
            active={false}
          />
        </View>
        <CalendarTab>
          <SportingCalendar selection={{ teamId, category: "upcoming" }} />
        </CalendarTab>
      </>
    );
  }
  const view = await render(calendars(sportingId), { wrapper: Providers });
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  holdOriginal = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await act(() => started.promise);

  // When: current intent changes while the former selection still has a legitimate mounted observer.
  try {
    await view.rerender(calendars(nextTeam));
    await screen.findByRole("link", {
      name: /Ouvrir le match Current team — Away/,
    });
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
  } finally {
    await act(async () => pending.resolve(Response.json({}, { status: 503 })));
  }
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then: current rows remain usable and a former read never announces an error in their context.
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Current team — Away/ }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeNull();
});

it("pages from club information through teams to the calendar and back without rereading common data", async () => {
  // Given
  const club = clubDetail();
  club.seasons = [matchDetail().match.pool.season];
  mockFetch.mockImplementation((url: string) => {
    const path = new URL(url).pathname;
    return Promise.resolve(
      Response.json(
        path.endsWith("/application-access")
          ? applicationAccessResponse()
          : path.endsWith(`/clubs/${sportingId}/teams`)
            ? { seasonId: club.seasons[0].id, items: [] }
            : path.endsWith(`/clubs/${sportingId}`)
              ? club
              : calendar,
      ),
    );
  });
  await render(<ClubScreen clubId={sportingId} />, { wrapper: Providers });
  await screen.findByRole("tab", { name: "Infos" });
  await screen.findByText("Coordonnées");

  // When: the native pager selects all resource tabs, including retained neighbour panels.
  await settleNativePage(1);
  await screen.findByText("Aucune équipe pour cette saison");
  await settleNativePage(2);
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await settleNativePage(1);

  // Then
  expect(
    await screen.findByRole("tab", { name: "Équipes", selected: true }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/clubs/${sportingId}`,
    ),
  ).toHaveLength(1);
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/clubs/${sportingId}/teams`,
    ),
  ).toHaveLength(1);
});

it("loads calendar tabs lazily and refreshes only the active calendar through generated consumers", async () => {
  // Given
  const team = {
    team: {
      team: calendar.days[0].pools[0].matches[0].home,
      season: { id: sportingId, label: "2026/2027", startYear: 2026 },
      classification: {},
      professional: true,
    },
    participations: [],
  };
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json(
        new URL(url).pathname.endsWith("/application-access")
          ? applicationAccessResponse()
          : new URL(url).pathname.endsWith(`/teams/${sportingId}`)
            ? team
            : calendar,
      ),
    ),
  );
  const events = jest.spyOn(AppState, "addEventListener");
  await render(<TeamScreen teamId={sportingId} />, { wrapper: Providers });
  await screen.findByRole("tab", { name: "À venir" });
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  const requests = mockFetch.mock.calls.length;

  // When
  await act(() => {
    events.mock.calls.forEach(([event, listener]) => {
      if (event === "change") listener("active");
    });
  });
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() => expect(mockFetch.mock.calls.length).toBe(requests + 1));

  // Then
  expect(new URL(mockFetch.mock.calls.at(-1)?.[0]).pathname).toBe("/matches");
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/teams/${sportingId}`,
    ),
  ).toHaveLength(1);
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).searchParams.get("category") === "completed",
    ),
  ).toHaveLength(0);

  // When: a visited sibling stays mounted, but only the newly displayed category refreshes.
  await userEvent.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByRole("tab", { name: "Terminés", selected: true });
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(
        ([url]) => new URL(url).searchParams.get("category") === "completed",
      ),
    ).toHaveLength(1),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(
        ([url]) => new URL(url).searchParams.get("category") === "completed",
      ),
    ).toHaveLength(2),
  );
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).searchParams.get("category") === "upcoming",
    ),
  ).toHaveLength(2);
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/teams/${sportingId}`,
    ),
  ).toHaveLength(1);
});

it("changes calendar category with the native horizontal pager without rereading page information", async () => {
  // Given
  const team = {
    team: {
      team: calendar.days[0].pools[0].matches[0].home,
      season: { id: sportingId, label: "2026/2027", startYear: 2026 },
      classification: {},
      professional: true,
    },
    participations: [],
  };
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json(
        new URL(url).pathname.endsWith("/application-access")
          ? applicationAccessResponse()
          : new URL(url).pathname.endsWith(`/teams/${sportingId}`)
            ? team
            : calendar,
      ),
    ),
  );
  await render(<TeamScreen teamId={sportingId} />, { wrapper: Providers });
  await screen.findByRole("tab", { name: "À venir" });
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });

  // When: native page settlement is not expressible with userEvent.
  await settleNativePage(1);

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("tab", { name: "Terminés", selected: true }),
    ).toBeOnTheScreen(),
  );
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === `/teams/${sportingId}`,
    ),
  ).toHaveLength(1);
});

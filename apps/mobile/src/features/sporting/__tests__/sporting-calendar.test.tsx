import {
  useLayoutEffect,
  useState as useQueryFixtureState,
  type PropsWithChildren as QueryFixtureProps,
  PropsWithChildren,
} from "react";
import {
  onlineManager,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
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
  // The isolated scene supplies focus; native route animation is verified on device.
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual("react").useEffect(effect, [effect]),
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
  onlineManager.setOnline(true);
});

/** Actual theme, access, session and cache; only native identity and HTTP are controlled. */
function Providers({ children }: Readonly<PropsWithChildren>) {
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
function CalendarTab({ children }: Readonly<PropsWithChildren>) {
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
    await layoutNativeTabs();

    // Then
    expect(
      screen.getByRole("link", { name: new RegExp(label) }),
    ).toBeOnTheScreen();
    if (!result || !("homeSets" in result)) {
      expect(screen.queryByText("0")).not.toBeOnTheScreen();
    }
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
    await layoutNativeTabs();
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

it("reloads an empty calendar through its card and restores native refresh only with matches", async () => {
  // Given: the same selected calendar is successfully empty, with no native refresh control.
  const populated = calendar;
  calendar = { ...calendar, days: [] };
  await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await layoutNativeTabs();
  await screen.findByText("Aucun match pour cette sélection");
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  const pending = Promise.withResolvers<Response>();
  mockFetch
    .mockClear()
    .mockImplementation((url: string) =>
      new URL(url).pathname === "/matches"
        ? pending.promise
        : Promise.resolve(Response.json(applicationAccessResponse())),
    );
  const user = userEvent.setup();

  // When: the card repeats only this read and prevents another activation while it is pending.
  await user.press(screen.getByRole("button", { name: "Actualiser" }));
  await user.press(
    screen.getByRole("button", {
      name: "Actualiser",
      busy: true,
      disabled: true,
    }),
  );

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const request = new URL(mockFetch.mock.calls[0][0]);
  expect(request.pathname).toBe("/matches");
  expect(request.searchParams.get("teamId")).toBe(sportingId);
  expect(request.searchParams.get("category")).toBe("upcoming");
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  await act(async () => pending.resolve(Response.json(populated)));
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  expect(screen.getByLabelText("Actualiser les données")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Actualiser" })).toBeNull();
});

it("replaces a cached empty calendar with a retryable error after its next read fails", async () => {
  // Given
  calendar = { ...calendar, days: [] };
  await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await layoutNativeTabs();
  await screen.findByText("Aucun match pour cette sélection");
  mockFetch.mockRejectedValue(new TypeError("offline"));

  // When
  await userEvent.press(screen.getByRole("button", { name: "Actualiser" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aucun match pour cette sélection")).toBeNull();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  mockFetch.mockResolvedValue(Response.json(calendar));

  // When
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByText("Aucun match pour cette sélection"),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("does not announce a paused new calendar as loading or successfully empty", async () => {
  // Given
  const opened = await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  await act(async () => onlineManager.setOnline(false));
  mockFetch.mockClear();

  // When
  await opened.rerender(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "completed" }}
      />
    </CalendarTab>,
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer", busy: false }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText("Aucun match pour cette sélection")).toBeNull();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("keeps a disabled calendar idle without a loading announcement or an admitted retry", async () => {
  // Given
  await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
        active={false}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );

  // When: the native scene mounts while its read scope remains inactive.
  await layoutNativeTabs();
  await screen.findByRole("alert");

  // Then
  expect(
    screen.queryByRole("progressbar", { name: "Chargement des matchs" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  expect(screen.queryByText("Aucun match pour cette sélection")).toBeNull();
  expect(
    mockFetch.mock.calls.some(([url]) => new URL(url).pathname === "/matches"),
  ).toBe(false);
});

it("uses the device zone on the first active calendar attempt after a deferred mount", async () => {
  // Given: the real calendar stays mounted but inactive while the device travels.
  let deviceZone = "Europe/Paris";
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  jest
    .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
    .mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...resolvedOptions.call(this), timeZone: deviceZone };
    });
  mockFetch.mockImplementation(async (url: string) =>
    new URL(url).pathname.endsWith("/application-access")
      ? Response.json(applicationAccessResponse())
      : Response.json({
          ...calendar,
          timeZone: new URL(url).searchParams.get("timeZone"),
        }),
  );
  const view = await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
        active={false}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await layoutNativeTabs();
  await screen.findByRole("alert");
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === "/matches",
    ),
  ).toHaveLength(0);
  deviceZone = "America/New_York";

  // When
  await view.rerender(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
      />
    </CalendarTab>,
  );

  // Then
  expect(
    await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(url).pathname === "/matches")
      .map(([url]) => new URL(url).searchParams.get("timeZone")),
  ).toEqual(["America/New_York"]);
});

it("retains the first attempted zone after failure and travel until an explicit retry", async () => {
  // Given: the first active attempt is held at the HTTP boundary after a deferred mount.
  let deviceZone = "Europe/Paris";
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  jest
    .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
    .mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...resolvedOptions.call(this), timeZone: deviceZone };
    });
  const pending = Promise.withResolvers<Response>();
  let firstAttempt = true;
  let unavailable = true;
  mockFetch.mockImplementation(async (url: string) => {
    if (new URL(url).pathname.endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    if (firstAttempt) {
      firstAttempt = false;
      return pending.promise;
    }
    return unavailable
      ? Response.json({}, { status: 503 })
      : Response.json({
          ...calendar,
          timeZone: new URL(url).searchParams.get("timeZone"),
          days: [],
        });
  });
  const view = await render(
    <CalendarTab>
      <SportingCalendar
        selection={{ teamId: sportingId, category: "upcoming" }}
        active={false}
      />
    </CalendarTab>,
    { wrapper: Providers },
  );
  await layoutNativeTabs();
  await screen.findByRole("alert");
  deviceZone = "America/New_York";

  try {
    // When: travel continues while the first active attempt is still pending.
    await view.rerender(
      <CalendarTab>
        <SportingCalendar
          selection={{ teamId: sportingId, category: "upcoming" }}
        />
      </CalendarTab>,
    );
    await screen.findByRole("progressbar", { name: "Chargement des matchs" });
    deviceZone = "Asia/Tokyo";
    await view.rerender(
      <CalendarTab>
        <SportingCalendar
          selection={{ teamId: sportingId, category: "upcoming" }}
          active={false}
        />
      </CalendarTab>,
    );
    await act(async () => pending.resolve(Response.json({}, { status: 503 })));
    await view.rerender(
      <CalendarTab>
        <SportingCalendar
          selection={{ teamId: sportingId, category: "upcoming" }}
        />
      </CalendarTab>,
    );

    // Then: Query may reread on activation, but it still owns the first attempted zone.
    expect(
      await screen.findByRole("button", { name: "Réessayer", busy: false }),
    ).toBeEnabled();
    const attemptedZones = mockFetch.mock.calls
      .filter(([url]) => new URL(url).pathname === "/matches")
      .map(([url]) => new URL(url).searchParams.get("timeZone"));
    expect(new Set(attemptedZones)).toEqual(new Set(["America/New_York"]));

    // When
    unavailable = false;
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(
      await screen.findByText("Aucun match pour cette sélection"),
    ).toBeOnTheScreen();
    expect(
      new URL(mockFetch.mock.calls.at(-1)?.[0]).searchParams.get("timeZone"),
    ).toBe("Asia/Tokyo");
  } finally {
    await act(async () => pending.resolve(Response.json({}, { status: 503 })));
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
  await layoutNativeTabs();
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
  await layoutNativeTabs();
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
  await layoutNativeTabs();
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
    screen.getByRole("progressbar", {
      name: "Chargement des matchs",
      busy: true,
    }),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

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
    if (target.pathname.endsWith("/application-access")) {
      return Promise.resolve(Response.json(applicationAccessResponse()));
    }
    if (!target.searchParams.has("nextDay") && failNext) {
      return Promise.resolve(Response.json(calendar));
    }
    if (failNext) {
      return Promise.reject(new TypeError("offline"));
    }
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
  await layoutNativeTabs();
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

  // Then: only the local footer reports failure; rows/cursor remain and no automatic retry runs.
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeNull();

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
  // Given: the real calendar has accepted rows and an available continuation.
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
  await layoutNativeTabs();
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
    if (target.pathname.endsWith("/application-access")) {
      return Promise.resolve(Response.json(applicationAccessResponse()));
    }
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
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockClear();
  await fireEvent(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
    "endReached",
  );
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

  // Then: continuation keeps the accepted match beside its compact generic progress line.
  expect(
    await screen.findByRole("progressbar", {
      name: "Chargement de la suite…",
      busy: true,
    }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Chargement de la suite…")).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();

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
    if (target.pathname.endsWith("/application-access")) {
      return Promise.resolve(Response.json(applicationAccessResponse()));
    }
    if (target.searchParams.get("teamId") === nextTeam) {
      return Promise.resolve(Response.json(nextCalendar));
    }
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
  await layoutNativeTabs();
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
    /** Routes controlled HTTP by the scenario’s exact sporting resource. */
    function calendarResponse() {
      if (path.endsWith("/application-access")) {
        return applicationAccessResponse();
      }
      if (path.endsWith(`/clubs/${sportingId}/teams`)) {
        return { seasonId: club.seasons[0].id, items: [] };
      }
      if (path.endsWith(`/clubs/${sportingId}`)) {
        return club;
      }
      return calendar;
    }

    const path = new URL(url).pathname;
    return Promise.resolve(Response.json(calendarResponse()));
  });
  await render(<ClubScreen clubId={sportingId} />, { wrapper: Providers });
  await screen.findByRole("tab", { name: "Infos" });
  await layoutNativeTabs();
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
  mockFetch.mockImplementation((url: string) => {
    /** Routes controlled HTTP by the scenario’s exact sporting resource. */
    function calendarResponse() {
      if (new URL(url).pathname.endsWith("/application-access")) {
        return applicationAccessResponse();
      }
      if (new URL(url).pathname.endsWith(`/teams/${sportingId}`)) {
        return team;
      }
      return calendar;
    }

    return Promise.resolve(Response.json(calendarResponse()));
  });
  const events = jest.spyOn(AppState, "addEventListener");
  await render(<TeamScreen teamId={sportingId} />, { wrapper: Providers });
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  const requests = mockFetch.mock.calls.length;

  // When
  await act(() => {
    events.mock.calls.forEach(([event, listener]) => {
      if (event === "change") {
        listener("active");
      }
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
  mockFetch.mockImplementation((url: string) => {
    /** Routes controlled HTTP by the scenario’s exact sporting resource. */
    function calendarResponse() {
      if (new URL(url).pathname.endsWith("/application-access")) {
        return applicationAccessResponse();
      }
      if (new URL(url).pathname.endsWith(`/teams/${sportingId}`)) {
        return team;
      }
      return calendar;
    }

    return Promise.resolve(Response.json(calendarResponse()));
  });
  await render(<TeamScreen teamId={sportingId} />, { wrapper: Providers });
  await screen.findByRole("tab", { name: "À venir" });
  await layoutNativeTabs();
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

it("admits team identity and independent tabs while its first standings remain pending", async () => {
  // Given: the real team and standings observers are held at their HTTP boundaries.
  const teamRead = Promise.withResolvers<Response>();
  const standingsRead = Promise.withResolvers<Response>();
  const pool = matchDetail().match.pool;
  const team = {
    team: {
      team: { id: sportingId, name: "Team awaiting admission" },
      season: pool.season,
      classification: {},
      professional: false,
    },
    participations: [pool],
  };
  const standings = {
    poolId: pool.pool.id,
    availability: "available",
    observedAt: "2026-10-28T12:00:00Z",
    lastAttemptFailed: false,
    columns: ["Points"],
    rows: [
      {
        sourceName: "Admitted official row",
        position: 1,
        statistics: { Points: "18" },
      },
    ],
  };
  mockFetch.mockImplementation((url: string) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/application-access")) {
      return Promise.resolve(Response.json(applicationAccessResponse()));
    }
    if (path === `/teams/${sportingId}`) {
      return teamRead.promise;
    }
    if (path.endsWith("/standings")) {
      return standingsRead.promise;
    }
    return Promise.resolve(Response.json(calendar));
  });

  try {
    // When
    await render(<TeamScreen teamId={sportingId} />, { wrapper: Providers });

    // Then: the unknown resource has one page announcement and no admitted tab reads.
    expect(
      await screen.findByRole("progressbar", {
        name: "Chargement de l’équipe",
      }),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(screen.queryByRole("tab")).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/standings"),
      ),
    ).toHaveLength(0);

    // When: common identity admits the page and its known participation starts its own read.
    await act(() => teamRead.resolve(Response.json(team)));
    await screen.findAllByRole("tab", { includeHiddenElements: true });
    await layoutNativeTabs();
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.filter(([url]) =>
          new URL(url).pathname.endsWith("/standings"),
        ),
      ).toHaveLength(1),
    );

    // Then: only the standings scene waits; common identity and independent tabs remain usable.
    expect(
      screen.getByRole("progressbar", {
        name: "Chargement du classement",
      }),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(
      screen.getByRole("tab", { name: "Pool", selected: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getAllByText("Team awaiting admission").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("progressbar", { name: "Chargement de l’équipe" }),
    ).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(
        ([url]) => new URL(url).pathname === "/matches",
      ),
    ).toHaveLength(0);

    // When: the user opens an independent calendar before the standings read settles.
    const user = userEvent.setup();
    await user.press(screen.getByRole("tab", { name: "À venir" }));

    // Then: that calendar is usable without completing or replacing the standings read.
    expect(
      await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ }),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/standings"),
      ),
    ).toHaveLength(1);

    // When: the user returns to the original scene and its held read succeeds.
    await user.press(screen.getByRole("tab", { name: "Pool" }));

    await act(() => standingsRead.resolve(Response.json(standings)));

    // Then
    expect(await screen.findByText("Admitted official row")).toBeOnTheScreen();
    expect(screen.getByRole("tab", { selected: true })).toBeOnTheScreen();
    expect(screen.queryAllByText("Team awaiting admission")).not.toHaveLength(
      0,
    );
    expect(
      screen.queryByLabelText("Chargement de l’équipe"),
    ).not.toBeOnTheScreen();
  } finally {
    await act(() => {
      teamRead.resolve(Response.json(team));
      standingsRead.resolve(Response.json(standings));
    });
  }
});

import type { PropsWithChildren } from "react";
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
import { AppState } from "react-native";
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
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
const environment = { ...process.env };
let client = createQueryClient();
let calendar: MatchCalendarResponse;

beforeEach(() => {
  client = createQueryClient();
  mockFetch.mockReset();
  mockPush.mockReset();
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
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...environment };
});

/** Actual theme, access, session and cache; only native identity and HTTP are controlled. */
function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ActionFeedbackProvider scopeKey="test">
          <ApplicationAccessProvider>
            <AccountSessionProvider>{children}</AccountSessionProvider>
          </ApplicationAccessProvider>
        </ActionFeedbackProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
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

it("retains calendar rows through an ordinary refresh failure and replaces them after success", async () => {
  // Given
  await render(
    <SportingCalendar
      selection={{ teamId: sportingId, category: "upcoming" }}
    />,
    { wrapper: Providers },
  );
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/application-access")
      ? Promise.resolve(Response.json(applicationAccessResponse()))
      : Promise.resolve(Response.json({}, { status: 503 })),
  );

  // When
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert");

  // Then
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();

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
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

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
    <SportingCalendar
      selection={{ teamId: sportingId, category: "upcoming" }}
    />,
    { wrapper: Providers },
  );
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  const refreshed = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(refreshed.promise);

  // When: native pull-to-refresh is not expressible through userEvent.
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  const more = screen.getByRole("button", {
    name: "Charger les journées suivantes",
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Charger les journées suivantes" }),
    ).toBeDisabled(),
  );
  await userEvent.press(more);
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
  await screen.findByText("Coordonnées");

  // When: native horizontal momentum selects all resource tabs, including existing neighbour panels.
  fireEvent(screen.getByTestId("sporting-tabs-pager"), "momentumScrollEnd", {
    nativeEvent: {
      contentOffset: { x: 402 },
      layoutMeasurement: { width: 402 },
    },
  });
  await screen.findByText("Aucune équipe pour cette saison");
  fireEvent(screen.getByTestId("sporting-tabs-pager"), "momentumScrollEnd", {
    nativeEvent: {
      contentOffset: { x: 804 },
      layoutMeasurement: { width: 402 },
    },
  });
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  fireEvent(screen.getByTestId("sporting-tabs-pager"), "momentumScrollEnd", {
    nativeEvent: {
      contentOffset: { x: 402 },
      layoutMeasurement: { width: 402 },
    },
  });

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
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });
  const requests = mockFetch.mock.calls.length;

  // When
  await act(() => {
    events.mock.calls.forEach(([event, listener]) => {
      if (event === "change") listener("active");
    });
  });
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
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
  await screen.findByRole("link", { name: /Ouvrir le match Home — Away/ });

  // When: native momentum completion is not expressible with userEvent.
  fireEvent(screen.getByTestId("sporting-tabs-pager"), "momentumScrollEnd", {
    nativeEvent: {
      contentOffset: { x: 402 },
      layoutMeasurement: { width: 402 },
    },
  });

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

import type { ReactElement } from "react";
import { onlineManager, type QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  ConsultationProviders,
  consultationPublicClient,
} from "../test-support/consultation-providers";
import {
  consultationResponse,
  matchDetail,
  sportingId,
} from "../test-support/consultation-data";
import { ClubScreen } from "../screens/club-screen";
import { TeamScreen } from "../screens/team-screen";
import { MatchScreen } from "../screens/match-screen";

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
  // These isolated features control native focus; route integration suites keep Router itself.
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual("react").useEffect(effect, [effect]),
  useRouter: () => ({ back: mockBack, push: mockPush, canGoBack: () => true }),
  useNavigation: () => ({ isFocused: () => true }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

const environment = { ...process.env };
let client: QueryClient;
let publicClient: QueryClient;
let detail = matchDetail();

/** Supplies controlled successful HTTP bodies while the feature's generated readers stay real. */
function reads(url: string) {
  return consultationResponse(url, detail);
}

/** Captures the real principal-owned QueryClient without replacing session or query behavior. */
function captureClient(current: QueryClient) {
  client = current;
}

/** Renders real feature composition and providers; the caller decides which reads should settle. */
function renderPage(content: ReactElement) {
  return render(content, {
    wrapper: ({ children }) => (
      <ConsultationProviders
        publicClient={publicClient}
        onClient={captureClient}
      >
        {children}
      </ConsultationProviders>
    ),
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  publicClient = consultationPublicClient();
  detail = matchDetail();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockFetch.mockReset().mockImplementation(reads);
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...environment };
  jest.restoreAllMocks();
  onlineManager.setOnline(true);
});

it("rereads the current match when its route regains focus and applies accepted result, date and link changes", async () => {
  // Given: route focus is supplied by Router; the screen owns its real Query read.
  const opened = await renderPage(<MatchScreen matchId={sportingId} focused />);
  await screen.findByText("Home");
  await opened.rerender(<MatchScreen matchId={sportingId} focused={false} />);
  mockFetch.mockClear();
  detail = {
    ...detail,
    streamUrl: "https://stream.example.invalid/current",
    match: {
      ...detail.match,
      category: "completed",
      schedule: { localDate: "2026-11-02", observedAt: "2026-10-30T12:00:00Z" },
      result: {
        state: "final",
        homeSets: 3,
        awaySets: 1,
        observedAt: "2026-10-30T12:00:00Z",
      },
    },
  };

  // When
  await opened.rerender(<MatchScreen matchId={sportingId} focused />);

  // Then
  expect(
    await screen.findByRole("link", { name: "Home · Score domicile : 3" }),
  ).toBeOnTheScreen();
  expect(screen.getAllByText(/2 novembre 2026/).length).toBeGreaterThan(0);
  expect(screen.getByText("Stream link")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith(`/matches/${sportingId}`),
    ),
  ).toHaveLength(1);
  expect(
    client.getQueryData<{ match: typeof detail.match }>([
      `/matches/${sportingId}`,
    ])?.match.result?.observedAt,
  ).toBe("2026-10-30T12:00:00Z");
});

it("shows pull progress only for the native gesture while a focus reread keeps the loaded match quiet", async () => {
  // Given: real Query reads stay pending at the HTTP boundary so each progress state is observable.
  const opened = await renderPage(
    <MatchScreen matchId={sportingId} focused={false} />,
  );
  await screen.findByText("Home");
  await waitFor(() => expect(client.isFetching()).toBe(0));
  const focusRead = Promise.withResolvers<Response>();
  const pullRead = Promise.withResolvers<Response>();
  mockFetch.mockClear().mockImplementationOnce(() => focusRead.promise);

  try {
    // When
    await opened.rerender(<MatchScreen matchId={sportingId} focused />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    // Then
    expect(screen.getByText("Home")).toBeOnTheScreen();
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();

    // When: userEvent cannot perform a native RefreshControl gesture.
    await act(() => focusRead.resolve(Response.json(detail)));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    mockFetch.mockImplementationOnce(() => pullRead.promise);
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    await waitFor(() =>
      expect(screen.getByLabelText("Actualiser les données")).toBeBusy(),
    );
    expect(screen.getByText("Home")).toBeOnTheScreen();

    // When
    await act(() => pullRead.resolve(Response.json(detail)));

    // Then
    await waitFor(() =>
      expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
    );
  } finally {
    await act(() => {
      focusRead.resolve(Response.json(detail));
      pullRead.resolve(Response.json(detail));
    });
  }
});

it("rereads on foreground only while focused, then applies result withdrawal on manual refresh", async () => {
  // Given
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((event, listener) => {
      if (event === "change") {
        listeners.push(listener);
      }
      return {
        remove: () => {
          const index = listeners.indexOf(listener);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        },
      };
    });
  const opened = await renderPage(<MatchScreen matchId={sportingId} focused />);
  await screen.findByText("Home");
  mockFetch.mockClear();
  detail.match.result = {
    state: "final",
    homeSets: 3,
    awaySets: 2,
    observedAt: "2026-10-30T12:00:00Z",
  };
  detail.match.category = "completed";

  // When
  await act(() => listeners.forEach((listener) => listener("active")));

  // Then
  expect(
    await screen.findByRole("link", { name: "Home · Score domicile : 3" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith(`/matches/${sportingId}`),
    ),
  ).toHaveLength(1);

  // When
  await opened.rerender(<MatchScreen matchId={sportingId} focused={false} />);
  mockFetch.mockClear();
  await act(() => listeners.forEach((listener) => listener("active")));

  // Then
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).includes(`/matches/${sportingId}`),
    ),
  ).toBe(false);

  // When
  await opened.rerender(<MatchScreen matchId={sportingId} focused />);
  await waitFor(() => expect(client.isFetching()).toBe(0));
  delete detail.match.result;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(await screen.findByText("Résultat indisponible")).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Home · Score domicile : 3" }),
  ).not.toBeOnTheScreen();
});

it("withdraws refused match facts at foreground and keeps them absent if the next explicit read fails", async () => {
  // Given
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((event, listener) => {
      if (event === "change") {
        listeners.push(listener);
      }
      return {
        remove: () => {
          const index = listeners.indexOf(listener);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        },
      };
    });
  detail.venueName = "Salle des Rives";
  await renderPage(<MatchScreen matchId={sportingId} />);
  await screen.findByLabelText("Lieu : Salle des Rives");
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/matches/${sportingId}`)
      ? Promise.resolve(Response.json({ status: 404 }, { status: 404 }))
      : reads(url),
  );

  // When
  await act(() => listeners.forEach((listener) => listener("active")));
  await screen.findByRole("alert");
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/matches/${sportingId}`)
      ? Promise.reject(new TypeError("offline"))
      : reads(url),
  );
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(
    screen.queryByLabelText("Lieu : Salle des Rives"),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText("Home")).not.toBeOnTheScreen();
  expect(screen.getByRole("alert")).toBeOnTheScreen();
});

it("retains an already loaded calendar across match focus/foreground reads without reclassification", async () => {
  // Given: both retained owners are mounted; no calendar key is shared with match detail.
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((event, listener) => {
      if (event === "change") {
        listeners.push(listener);
      }
      return {
        remove: () => {
          const index = listeners.indexOf(listener);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        },
      };
    });
  const calendarMatch = matchDetail().match;
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname === "/matches"
      ? Promise.resolve(
          Response.json({
            category: "upcoming",
            timeZone: new URL(url).searchParams.get("timeZone"),
            evaluatedAt: "2026-10-25T12:00:00Z",
            days: [
              {
                date: "2026-10-25",
                pools: [
                  {
                    poolId: sportingId,
                    pool: calendarMatch.pool,
                    matches: [calendarMatch],
                  },
                ],
              },
            ],
          }),
        )
      : reads(url),
  );
  const opened = await renderPage(
    <>
      <TeamScreen teamId={sportingId} />
      <MatchScreen matchId={sportingId} focused={false} />
    </>,
  );
  // The Team's actual first scene measures before the initial presentation reveals its identity.
  await screen.findAllByRole("tab", { includeHiddenElements: true });
  await layoutNativeTabs();
  await screen.findByText("Équipe des Rives");
  await layoutNativeTabs();
  await userEvent.setup().press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findAllByText("Home");
  await waitFor(() => expect(client.isFetching()).toBe(0));
  const calendarReads = mockFetch.mock.calls.filter(
    ([url]) => new URL(url).pathname === "/matches",
  ).length;
  detail.match.category = "completed";
  detail.match.result = {
    state: "final",
    homeSets: 3,
    awaySets: 0,
    observedAt: "2026-10-30T12:00:00Z",
  };

  // When
  await opened.rerender(
    <>
      <TeamScreen teamId={sportingId} />
      <MatchScreen matchId={sportingId} focused />
    </>,
  );
  await screen.findByRole("link", { name: "Home · Score domicile : 3" });
  await act(() => listeners.forEach((listener) => listener("active")));
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(
    mockFetch.mock.calls.filter(
      ([url]) => new URL(url).pathname === "/matches",
    ),
  ).toHaveLength(calendarReads);
  expect(
    screen.getByRole("link", { name: /Ouvrir le match Home — Away/ }),
  ).toBeOnTheScreen();
});

it("refreshes only the active club tab while preserving common information and sibling calendars", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByText("Club des Rives");
  await layoutNativeTabs();
  await screen.findByText("Coordonnées");
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findByText("Aucun match pour cette sélection");
  await user.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByText("Aucun match pour cette sélection");
  await waitFor(() => expect(client.isFetching()).toBe(0));
  mockFetch.mockClear();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

  // When: the empty active calendar owns refresh on its card, not through a native gesture.
  await user.press(screen.getByRole("button", { name: "Actualiser" }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(mockFetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
    "/matches",
  ]);
  expect(new URL(mockFetch.mock.calls[0][0]).searchParams.get("category")).toBe(
    "completed",
  );
});

it("retains accepted facts in Query while a failed focus reread replaces Match content with its card", async () => {
  // Given
  const opened = await renderPage(
    <MatchScreen matchId={sportingId} focused={false} />,
  );
  await screen.findByText("Home");
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/matches/${sportingId}`)
      ? Promise.reject(new TypeError("offline"))
      : reads(url),
  );

  // When
  await opened.rerender(<MatchScreen matchId={sportingId} focused />);

  // Then
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
  expect(screen.queryByText("Home")).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(client.getQueryData([`/matches/${sportingId}`])).toEqual(detail);
});

it("does not retain a successful empty club-team state after its explicit read fails", async () => {
  // Given
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByText("Club des Rives");
  await layoutNativeTabs();
  await userEvent.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByText("Aucune équipe pour cette saison");
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/teams")
      ? Promise.reject(new TypeError("offline"))
      : reads(url),
  );

  // When
  await userEvent.press(screen.getByRole("button", { name: "Actualiser" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aucune équipe pour cette saison")).toBeNull();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getByText("Club des Rives")).toBeOnTheScreen();
  mockFetch.mockImplementation(reads);

  // When
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByText("Aucune équipe pour cette saison"),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("retains permitted Match facts in Query through failed refresh and reconnect until explicit Retry succeeds", async () => {
  // Given: real screen, generated reader and Query owners; only the HTTP boundary is controlled.
  detail.venueName = "Salle conservée";
  await renderPage(<MatchScreen matchId={sportingId} />);
  await screen.findByLabelText("Lieu : Salle conservée");
  await waitFor(() => expect(client.isFetching()).toBe(0));
  mockFetch.mockClear();
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/matches/${sportingId}`)
      ? Promise.reject(new TypeError("offline"))
      : reads(url),
  );

  // When: userEvent cannot express the native RefreshControl gesture.
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await screen.findByRole("alert");
  expect(
    screen.queryByLabelText("Lieu : Salle conservée"),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText("Home")).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();

  // When: ordinary Query reconnect reads may run; they cannot replay a business command.
  await act(() => onlineManager.setOnline(false));
  await act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then: reconnect with the source still failing does not invent absence or recovery.
  expect(
    screen.queryByLabelText("Lieu : Salle conservée"),
  ).not.toBeOnTheScreen();
  expect(
    client.getQueryData<{ match: typeof detail.match }>([
      `/matches/${sportingId}`,
    ])?.match.schedule.observedAt,
  ).toBe(detail.match.schedule.observedAt);
  expect(
    mockFetch.mock.calls.every(
      ([, options]) => (options?.method ?? "GET") === "GET",
    ),
  ).toBe(true);

  // When: explicit Retry reads current facts through the same owner.
  detail = { ...detail, venueName: "Salle corrigée" };
  mockFetch.mockImplementation(reads);
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await screen.findByLabelText("Lieu : Salle corrigée");
  expect(
    screen.queryByLabelText("Lieu : Salle conservée"),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(
      ([, options]) => (options?.method ?? "GET") === "GET",
    ),
  ).toBe(true);
});

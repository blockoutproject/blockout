import type { ReactElement } from "react";
import { type QueryClient } from "@tanstack/react-query";
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
  expect(screen.getAllByText(/2 nov. 2026/).length).toBeGreaterThan(0);
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

it("rereads on foreground only while focused, then applies result withdrawal on manual refresh", async () => {
  // Given
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((event, listener) => {
      if (event === "change") listeners.push(listener);
      return {
        remove: () => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
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
      if (event === "change") listeners.push(listener);
      return {
        remove: () => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
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
      if (event === "change") listeners.push(listener);
      return {
        remove: () => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
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
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await screen.findByText("Aucun match pour cette sélection");
  await user.press(screen.getByRole("tab", { name: "Terminés" }));
  await screen.findByText("Aucun match pour cette sélection");
  await waitFor(() => expect(client.isFetching()).toBe(0));
  mockFetch.mockClear();

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
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

it("uses only transient feedback for a failed focus reread while keeping accepted match facts", async () => {
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
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getByText("Home")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
});

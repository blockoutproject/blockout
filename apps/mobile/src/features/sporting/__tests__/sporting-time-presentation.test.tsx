import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { matchDetail, sportingId } from "../test-support/consultation-data";
import { MatchSummary } from "../components/match-summary";
import { MatchScreen } from "../screens/match-screen";

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
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const environment = { ...process.env };
const NativeDateTimeFormat = Intl.DateTimeFormat;
let deviceZone: string;
let client = createQueryClient();

beforeEach(() => {
  client = createQueryClient();
  deviceZone = "Europe/Paris";
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-09-10T12:00:00Z"));
  // Only the native default zone is controlled; actual Intl conversion/formatting is exercised.
  jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
    (locales, options) =>
      new NativeDateTimeFormat(locales, {
        ...options,
        timeZone: options?.timeZone ?? deviceZone,
      }),
  );
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  mockFetch.mockReset();
});
afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
  jest.useRealTimers();
  process.env = { ...environment };
});

/** Real feature providers; HTTP, native identity and the device's default zone are controlled. */
function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>{children}</AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

it("renders a readable unchanged date and meaningful unknown-time label", async () => {
  // Given
  const match = matchDetail().match;
  match.schedule = {
    localDate: "2026-09-20",
    observedAt: "2026-09-19T12:00:00Z",
  };
  deviceZone = "America/New_York";
  mockFetch.mockResolvedValue(Response.json(applicationAccessResponse()));

  // When
  await render(<MatchSummary match={match} />, { wrapper: Providers });

  // Then
  expect(screen.getByText("20 sept. 2026")).toBeOnTheScreen();
  expect(screen.getByText("Heure à définir")).toBeOnTheScreen();
  expect(screen.queryByText(/00:00/)).not.toBeOnTheScreen();
});

it("updates retained match detail to the current phone zone on foreground return", async () => {
  // Given: the actual screen and generated decoder consume a controlled public match.
  const detail = matchDetail();
  detail.match.schedule = {
    localDate: "2026-09-20",
    instant: "2026-09-20T00:30:00+02:00",
    timeZone: "Europe/Paris",
    observedAt: "2026-09-19T12:00:00Z",
  };
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json(
        new URL(url).pathname.endsWith("/application-access")
          ? applicationAccessResponse()
          : detail,
      ),
    ),
  );
  const events = jest.spyOn(AppState, "addEventListener");
  await render(<MatchScreen matchId={sportingId} />, { wrapper: Providers });
  await screen.findAllByText("20 sept. 2026 à 00:30");
  const requests = mockFetch.mock.calls.length;

  // When
  deviceZone = "America/New_York";
  await act(() => {
    events.mock.calls.forEach(([event, listener]) => {
      if (event === "change") listener("active");
    });
  });

  // Then: presentation alone needs no reread; actual calendar/navigation qualification is T023.
  expect(screen.getAllByText("19 sept. 2026 à 18:30")).toHaveLength(2);
  expect(screen.queryByText("20 sept. 2026 à 00:30")).not.toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(requests);
});

it("uses the rendering day when an initial match response crosses midnight", async () => {
  // Given
  jest.setSystemTime(new Date("2026-09-19T21:59:59Z"));
  const detail = matchDetail();
  detail.match.schedule.localDate = "2026-09-20";
  const pendingMatch = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname.endsWith("/application-access")
      ? Promise.resolve(Response.json(applicationAccessResponse()))
      : pendingMatch.promise,
  );
  await render(<MatchScreen matchId={sportingId} />, { wrapper: Providers });
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([url]) =>
        new URL(url).pathname.includes("/matches/"),
      ),
    ).toBe(true),
  );

  // When
  jest.setSystemTime(new Date("2026-09-19T22:00:01Z"));
  await act(async () => pendingMatch.resolve(Response.json(detail)));

  // Then
  expect(
    await screen.findByText("Aujourd’hui · 20 sept. 2026"),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Demain · 20 sept. 2026")).not.toBeOnTheScreen();
});

it("keeps the summary pool heading informational instead of inventing a navigation control", async () => {
  // Given
  const match = matchDetail().match;
  mockFetch.mockResolvedValue(Response.json(applicationAccessResponse()));

  // When
  await render(<MatchSummary match={match} />, { wrapper: Providers });

  // Then
  expect(screen.getByText(match.pool.pool.name)).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: match.pool.pool.name }),
  ).not.toBeOnTheScreen();
});

it("does not introduce an empty score section on an upcoming match without accepted result or sets", async () => {
  // Given
  const detail = matchDetail();
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json(
        new URL(url).pathname.endsWith("/application-access")
          ? applicationAccessResponse()
          : detail,
      ),
    ),
  );

  // When
  await render(<MatchScreen matchId={sportingId} />, { wrapper: Providers });
  await screen.findByRole("link", { name: detail.match.home.name });

  // Then
  expect(screen.getByText("À venir")).toBeOnTheScreen();
  expect(screen.queryByRole("header", { name: "Score" })).not.toBeOnTheScreen();
});

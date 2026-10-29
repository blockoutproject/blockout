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
import { AppState, Text, type AppStateStatus } from "react-native";
import { NotificationsScreen } from "../screens/notifications-screen";
import { NotificationState } from "../state/notification-state";
import {
  createQueryClient,
  bindSessionQueries,
} from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { useCurrentAccount } from "../../accounts/current-account";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { notificationResponse } from "../test-support/notification-data";
import { notificationMessageSamples } from "../test-support/notification-message-samples";
import { useLayoutEffect, type PropsWithChildren } from "react";
import { setBadgeCountAsync } from "expo-notifications";

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
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
jest.mock("expo-notifications", () => ({
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
}));
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => mockNavigation,
}));
const mockPush = jest.fn();
let mockFocused = true;
const mockNavigation = {
  isFocused: () => mockFocused,
  addListener: jest.fn(() => () => undefined),
};
const mockFetch = jest.fn();
const env = { ...process.env };
let client = createQueryClient();
const row = notificationResponse();
let rows = [row];
let total = 7;
let nextExpiry = "2026-11-10T00:00:00Z";
let currentSession: ReturnType<typeof useAccountSession>;
let readResponseLost = false;

/** Native and HTTP are controlled; session, admission, Query, generated clients and visible controls stay real. */
function Harness({ children }: PropsWithChildren) {
  const session = useAccountSession();
  useLayoutEffect(() => {
    currentSession = session;
  }, [session]);
  useCurrentAccount();
  useLayoutEffect(
    () => bindSessionQueries(client, session.subscribe, session.isCurrent),
    [session.subscribe, session.isCurrent],
  );
  return (
    <AccountFeedbackProvider>
      <NotificationState>{children}</NotificationState>
    </AccountFeedbackProvider>
  );
}

/** Provides deterministic server outcomes without a second client cache or fake business owner. */
async function response(url: string, init: RequestInit): Promise<Response> {
  const path = new URL(url).pathname;
  if (path.endsWith("application-access"))
    return Response.json(applicationAccessResponse());
  if (path.endsWith("accounts/me"))
    return Response.json(accountResponse({ accountId: row.id }));
  if (path.endsWith("notification-summary"))
    return Response.json(
      total
        ? { unreadCount: total, nextExpiryAt: nextExpiry }
        : { unreadCount: 0 },
    );
  if (path.endsWith("/notifications"))
    return Response.json({ notifications: rows });
  if (path.endsWith(`/notifications/${row.id}`)) {
    if (init.method === "PATCH") {
      rows = rows.map((value) => ({ ...value, read: true }));
      total = 6;
      if (readResponseLost) throw new TypeError("lost acknowledgement");
    }
    return Response.json({ ...row, read: true });
  }
  throw new Error(`Unexpected synthetic boundary ${path}`);
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
  client = createQueryClient();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "synthetic-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("synthetic-owner"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue(undefined);
  mockFetch.mockReset().mockImplementation(response);
  mockPush.mockReset();
  jest.mocked(setBadgeCountAsync).mockClear();
  rows = [row];
  total = 7;
  nextExpiry = "2026-11-10T00:00:00Z";
  readResponseLost = false;
  mockFocused = true;
});
afterEach(async () => {
  await cleanup();
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  process.env = { ...env };
  jest.restoreAllMocks();
});

/** Renders the real feature below its production owner boundaries. */
async function showInbox() {
  return render(<NotificationsScreen />, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AdvertisingProviders>
                <Harness>{children}</Harness>
              </AdvertisingProviders>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
}

it("shows the whole confirmed count while displaying one unread card and never marks on display", async () => {
  // Given
  await showInbox();

  // When
  const item = await screen.findByRole("link", { name: /non lue$/ });

  // Then
  expect(item).toBeOnTheScreen();
  await waitFor(() => expect(setBadgeCountAsync).toHaveBeenLastCalledWith(7));
  expect(mockFetch.mock.calls.some(([, init]) => init.method === "PATCH")).toBe(
    false,
  );
});

it("keeps four family choices in server order through refresh and reopening", async () => {
  // Given: generated clients validate these server examples into the real private Query cache.
  rows = notificationMessageSamples
    .filter((_, index) => index % 3 === 0)
    .map(([family, title], index) => ({
      ...notificationResponse(),
      id: `00000000-0000-4000-8000-${String(600 + index).padStart(12, "0")}`,
      family,
      title,
      read: index % 2 === 0,
      match: {
        ...row.match,
        home: { ...row.match.home, name: "Nantes" },
        away: { ...row.match.away, name: "Tours" },
        result: {
          state: "final",
          homeSets: 3,
          awaySets: 1,
          observedAt: row.createdAt,
        },
      },
    }));
  const view = await showInbox();
  await screen.findByText(rows[0].title);
  const originalNames = screen
    .getAllByRole("link")
    .map((link) => link.props.accessibilityLabel);

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(url).pathname.endsWith("/notifications"),
      ),
    ).toHaveLength(2),
  );
  await view.rerender(<Text>Autre écran</Text>);
  await view.rerender(<NotificationsScreen />);

  // Then
  await waitFor(() =>
    expect(
      screen.getAllByRole("link").map((link) => link.props.accessibilityLabel),
    ).toEqual(originalNames),
  );
  for (const entry of rows)
    expect(screen.getByText(entry.title)).toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, init]) => init.method === "PATCH")).toBe(
    false,
  );
  expect(
    screen.queryByRole("button", {
      name: /supprimer|archiver|réglages|campagne/i,
    }),
  ).toBeNull();
});

it("keeps confirmed reading after navigation fails, including a discreet lost-response observation", async () => {
  // Given
  readResponseLost = true;
  mockPush.mockImplementation(() => {
    throw new Error("native navigation unavailable");
  });
  await showInbox();
  const user = userEvent.setup();

  // When
  await user.press(await screen.findByRole("link", { name: /non lue$/ }));

  // Then
  await screen.findByRole("link", { name: /— lue$/ });
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: row.match.id },
  });
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
  ).toHaveLength(1);
  await waitFor(() => expect(setBadgeCountAsync).toHaveBeenLastCalledWith(6));
});

it("uses the initial error card but retains authorized cards with a toast after failed pull-to-refresh", async () => {
  // Given
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? Promise.reject(new TypeError("offline"))
      : response(url, init),
  );
  await showInbox();
  const user = userEvent.setup();
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aucune notification pour le moment")).toBeNull();

  // When
  mockFetch.mockImplementation(response);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByRole("link", { name: /non lue$/ });
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? Promise.reject(new TypeError("offline"))
      : response(url, init),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await screen.findByRole("alert", { name: /Une erreur est survenue/ });
  expect(screen.getByRole("link", { name: /non lue$/ })).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: /Réessayer/ }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText("Aucune notification pour le moment")).toBeNull();

  // When
  mockFetch.mockImplementation(response);
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("link", { name: /non lue$/ }),
  ).toBeOnTheScreen();
});

it("removes known expired content while active offline without restoring it after a failed read", async () => {
  // Given
  rows = [
    {
      ...row,
      createdAt: new Date(Date.now() - 29 * 86_400_000 + 1000).toISOString(),
    },
  ];
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, callback) => {
    listeners.push(callback);
    return { remove: jest.fn() };
  });
  await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  jest.setSystemTime(Date.now() + 2000);
  mockFetch.mockRejectedValue(new TypeError("offline"));

  // When
  await act(async () => {
    listeners.forEach((listener) => listener("active"));
    await jest.advanceTimersByTimeAsync(0);
  });

  // Then
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
  expect(
    await screen.findByText("Aucune notification pour le moment"),
  ).toBeOnTheScreen();
});

it("shows loading before an accepted empty inbox and offers no manual cleanup", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? pending.promise
      : response(url, init),
  );
  await showInbox();
  expect(
    await screen.findByRole("progressbar", {
      name: "Chargement des notifications",
    }),
  ).toBeOnTheScreen();

  // When
  await act(async () => pending.resolve(Response.json({ notifications: [] })));

  // Then
  expect(
    await screen.findByText("Aucune notification pour le moment"),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: /supprimer|archiver|restaurer/i }),
  ).toBeNull();
});

it("expires an unloaded summary row while active offline and clears the exact badge without counting loaded rows", async () => {
  // Given
  nextExpiry = new Date(Date.now() + 1000).toISOString();
  await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  await waitFor(() => expect(setBadgeCountAsync).toHaveBeenLastCalledWith(7));
  mockFetch.mockRejectedValue(new TypeError("offline"));

  // When
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });

  // Then
  expect(screen.getByRole("link", { name: /non lue$/ })).toBeOnTheScreen();
  expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
  expect(
    jest.mocked(setBadgeCountAsync).mock.calls.some(([count]) => count === 1),
  ).toBe(false);
});

it("clears the app badge on session invalidation and excludes guest private reads even when the native badge is unsupported", async () => {
  // Given
  jest
    .mocked(setBadgeCountAsync)
    .mockRejectedValueOnce(new Error("unsupported"));
  await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  const before = mockFetch.mock.calls.length;

  // When
  await act(async () => {
    await currentSession.clearCredentials();
  });

  // Then
  expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
  expect(
    mockFetch.mock.calls
      .slice(before)
      .some(([url]) => /notification/.test(url)),
  ).toBe(false);
});

it("loads only the focused inbox and retains rows while its toast reports failure and the footer retries the same cursor", async () => {
  // Given
  const second = {
    ...row,
    id: "00000000-0000-4000-8000-000000000239",
    title: "Un lien a été partagé pour suivre le match",
  };
  let failNext = true;
  mockFetch.mockImplementation((url: string, init: RequestInit) => {
    const target = new URL(url);
    if (!target.pathname.endsWith("/notifications")) return response(url, init);
    if (!target.searchParams.has("cursor"))
      return Promise.resolve(
        Response.json(
          failNext
            ? { notifications: [row], nextCursor: "same-boundary" }
            : { notifications: [second] },
        ),
      );
    if (failNext) return Promise.reject(new TypeError("offline"));
    return Promise.resolve(Response.json({ notifications: [second] }));
  });
  await showInbox();
  const user = userEvent.setup();
  const first = await screen.findByRole("link", {
    name: /^Le résultat.*non lue$/,
  });

  // When: only the focused list consumes a native end-of-list event.
  mockFocused = false;
  await fireEvent(first, "endReached");

  // Then
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).searchParams.has("cursor"),
    ),
  ).toHaveLength(0);

  // When
  mockFocused = true;
  await fireEvent(first, "endReached");

  // Then
  expect(
    await screen.findByRole("button", {
      name: "Réessayer",
    }),
  ).toBeOnTheScreen();
  await fireEvent(first, "endReached");
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).searchParams.has("cursor"),
    ),
  ).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: /^Le résultat.*non lue$/ }),
  ).toBeOnTheScreen();
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();

  // When
  failNext = false;
  await user.press(screen.getByRole("button", { name: /Réessayer/ }));

  // Then
  expect(
    await screen.findByRole("link", { name: /^Un lien.*non lue$/ }),
  ).toBeOnTheScreen();
  await fireEvent(
    screen.getByRole("link", { name: /^Un lien.*non lue$/ }),
    "endReached",
  );
  expect(
    screen.queryByRole("button", { name: /Réessayer/ }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Charger la suite" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(url).searchParams.has("cursor"))
      .map(([url]) => new URL(url).searchParams.get("cursor")),
  ).toEqual(["same-boundary", "same-boundary"]);
});

it("keeps the 29-day deadline armed beyond the platform timeout limit without premature network refresh", async () => {
  // Given
  rows = [{ ...row, createdAt: new Date(Date.now()).toISOString() }];
  nextExpiry = new Date(Date.now() + 29 * 86_400_000).toISOString();
  await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  await waitFor(() => expect(setBadgeCountAsync).toHaveBeenLastCalledWith(7));
  mockFetch.mockClear().mockRejectedValue(new TypeError("offline"));

  // When
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2_147_483_647);
  });

  // Then
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: /non lue$/ })).toBeOnTheScreen();

  // When
  await act(async () => {
    await jest.advanceTimersByTimeAsync(29 * 86_400_000 - 2_147_483_647);
  });

  // Then
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
  expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
});

it("waits for foreground before refreshing an expired background inbox", async () => {
  // Given
  rows = [
    {
      ...row,
      createdAt: new Date(Date.now() - 29 * 86_400_000 + 1000).toISOString(),
    },
  ];
  nextExpiry = new Date(Date.now() + 1000).toISOString();
  const listeners: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, callback) => {
    listeners.push(callback);
    return { remove: jest.fn() };
  });
  await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  await act(async () => {
    listeners.forEach((listener) => listener("background"));
  });
  mockFetch.mockClear().mockRejectedValue(new TypeError("offline"));

  // When
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });

  // Then
  expect(mockFetch).not.toHaveBeenCalled();

  // When
  await act(async () => {
    listeners.forEach((listener) => listener("active"));
    await jest.advanceTimersByTimeAsync(0);
  });

  // Then
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
  expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
});

it("excludes a previously cached expired card on the first offline reopening render", async () => {
  // Given
  const view = await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  await view.rerender(<Text>Autre écran</Text>);
  jest.setSystemTime(new Date("2026-11-23T12:00:00Z"));
  mockFetch.mockRejectedValue(new TypeError("offline"));

  // When
  await view.rerender(<NotificationsScreen />);

  // Then
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
  expect(
    await screen.findByText("Aucune notification pour le moment"),
  ).toBeOnTheScreen();
});

import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import {
  AccessibilityInfo,
  AppState,
  Text,
  type AppStateStatus,
} from "react-native";
import type { InboxData } from "../api/inbox-queries";
import { NotificationsScreen } from "../screens/notifications-screen";
import { NotificationState } from "../state/notification-state";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import { useCurrentAccount } from "@/features/accounts/current-account";
import { AccountFeedbackProvider } from "@/features/accounts/test-support/account-feedback-provider";
import { AdvertisingProviders } from "@/features/advertising/test-support/advertising-providers";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { notificationResponse } from "../test-support/notification-data";
import { notificationMessageSamples } from "../test-support/notification-message-samples";
import { useLayoutEffect, useState, type PropsWithChildren } from "react";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => mockNavigation,
  useIsFocused: () => mockFocused,
}));
const mockPush = jest.fn();
let mockFocused = true;
const mockNavigation = {
  isFocused: () => mockFocused,
  addListener: jest.fn(
    (_event: string, _listener: () => void) => () => undefined,
  ),
};
const mockFetch = jest.fn();
const env = { ...process.env };
let client = createQueryClient();
let privateClient: ReturnType<typeof createQueryClient>;
const row = notificationResponse();
let rows = [row];
let currentSession: ReturnType<typeof useAccountSession>;
let readResponseLost = false;

/** Native and HTTP are controlled; session, admission, Query, generated clients and visible controls stay real. */
function Harness({ children }: Readonly<PropsWithChildren>) {
  const session = useAccountSession();
  const cache = useQueryClient();
  useLayoutEffect(() => {
    privateClient = cache;
  }, [cache]);
  useState(() => cache.setDefaultOptions({ queries: { retry: false } }));
  useLayoutEffect(() => {
    currentSession = session;
  }, [session]);
  useCurrentAccount();
  return (
    <AccountFeedbackProvider>
      <NotificationState>{children}</NotificationState>
    </AccountFeedbackProvider>
  );
}

/** Provides deterministic server outcomes without a second client cache or fake business owner. */
async function response(url: string, init: RequestInit): Promise<Response> {
  const path = new URL(url).pathname;
  if (path.endsWith("application-access")) {
    return Response.json(applicationAccessResponse());
  }
  if (path.endsWith("accounts/me")) {
    return Response.json(accountResponse({ accountId: row.id }));
  }
  if (path.endsWith("/notifications")) {
    return Response.json({ notifications: rows });
  }
  if (path.endsWith(`/notifications/${row.id}`)) {
    if (init.method === "PATCH") {
      rows = rows.map((value) => ({ ...value, read: true }));

      if (readResponseLost) {
        throw new TypeError("lost acknowledgement");
      }
    }
    return Response.json({ ...row, read: true });
  }
  throw new Error(`Unexpected synthetic boundary ${path}`);
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
  client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
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

  rows = [row];

  readResponseLost = false;
  mockFocused = true;
});
afterEach(async () => {
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).endsWith("/notification-summary"),
    ),
  ).toBe(false);
  await cleanup();
  client.clear();
  privateClient?.clear();
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

it("displays one unread card without summary requests or marking on display", async () => {
  // Given
  await showInbox();

  // When
  const item = await screen.findByRole("link", { name: /non lue$/ });

  // Then
  expect(item).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => url.endsWith("notification-summary")),
  ).toBe(false);
  expect(mockFetch.mock.calls.some(([, init]) => init.method === "PATCH")).toBe(
    false,
  );
});

it("keeps the displayed order and accessible names through refresh and reopening", async () => {
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
  for (const entry of rows) {
    expect(screen.getByText(entry.title)).toBeOnTheScreen();
  }
  expect(mockFetch.mock.calls.some(([, init]) => init.method === "PATCH")).toBe(
    false,
  );
  expect(
    screen.queryByRole("button", {
      name: /supprimer|archiver|réglages|campagne/i,
    }),
  ).toBeNull();
});

it.each([false, true])(
  "keeps accepted read state when navigation fails (lost acknowledgement: %s)",
  async (lost) => {
    // Given
    readResponseLost = lost;
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
  },
);

it("reports a tap failure once when navigation and its independent read command fail at different times", async () => {
  // Given
  const reading = Promise.withResolvers<Response>();
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    init.method === "PATCH" ? reading.promise : response(url, init),
  );
  mockPush.mockImplementation(() => {
    throw new Error("Native navigation unavailable");
  });
  await showInbox();
  const user = userEvent.setup();

  // When
  await user.press(await screen.findByRole("link", { name: /non lue$/ }));
  await waitFor(() => expect(announce).toHaveBeenCalledTimes(1));

  // Then
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
  ).toHaveLength(1);

  // When
  await act(async () =>
    reading.reject(new TypeError("Read acknowledgement unavailable")),
  );
  await waitFor(() => expect(privateClient.isMutating()).toBe(0));

  // Then
  expect(announce).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
  ).toHaveLength(1);
  expect(screen.getByRole("link", { name: /non lue$/ })).toBeOnTheScreen();
});

it("revalidates cached cards on focus without pulling, and shows progress only for a manual pull", async () => {
  // Given: automatic focus and the native pull use the same real Query read owner.
  const view = await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  await waitFor(() => expect(privateClient.isFetching()).toBe(0));
  let finishRead: (value: Response) => void = () => undefined;
  const delayedRead = jest.fn(
    () =>
      new Promise<Response>((resolve) => {
        finishRead = resolve;
      }),
  );
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? delayedRead()
      : response(url, init),
  );
  const focus = mockNavigation.addListener.mock.calls
    .filter(([event]) => event === "focus")
    .at(-1)?.[1];
  expect(focus).toBeDefined();

  // When
  mockFocused = false;
  await view.rerender(<NotificationsScreen />);
  mockFocused = true;
  await view.rerender(<NotificationsScreen />);
  await act(async () => focus?.());
  await waitFor(() => expect(delayedRead).toHaveBeenCalledTimes(1));
  // Deliver Query's scheduled observer notification before checking native progress.
  await act(() => jest.advanceTimersByTimeAsync(0));
  expect(privateClient.isFetching()).toBe(1);

  // Then: a background read must not ask iOS to reveal its refresh control.
  expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
  expect(screen.getByRole("link", { name: /non lue$/ })).toBeOnTheScreen();
  await act(async () => finishRead(Response.json({ notifications: rows })));
  await waitFor(() => expect(privateClient.isFetching()).toBe(0));

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() => expect(delayedRead).toHaveBeenCalledTimes(2));

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).toBeBusy(),
  );
  await act(async () => finishRead(Response.json({ notifications: rows })));
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
  );
  expect(screen.getByRole("link", { name: /non lue$/ })).toBeOnTheScreen();
});

it("masks retained cards after a full refresh failure and keeps its card during explicit Retry", async () => {
  // Given: real Query retains pages, while only the HTTP result is controlled.
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? Promise.reject(new TypeError("offline first read"))
      : response(url, init),
  );
  await showInbox();
  const user = userEvent.setup();
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  mockFetch.mockImplementation(response);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByRole("link", { name: /non lue$/ });
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? Promise.reject(new TypeError("offline"))
      : response(url, init),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
  expect(
    privateClient.getQueryData<InboxData>([`/accounts/${row.id}/notifications`])
      ?.pages[0].notifications,
  ).toEqual([row]);
  const retried = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? retried.promise
      : response(url, init),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    screen.getByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeBusy();
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();

  // When
  await act(async () =>
    retried.resolve(Response.json({ notifications: rows })),
  );

  // Then
  expect(
    await screen.findByRole("link", { name: /non lue$/ }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
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
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Aucune notification pour le moment"),
  ).not.toBeOnTheScreen();
});

it("uses local read recovery after a cached empty inbox fails and restores accepted notifications", async () => {
  // Given
  rows = [];
  await showInbox();
  await screen.findByText("Aucune notification pour le moment");
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? Promise.reject(new TypeError("Synthetic read failure"))
      : response(url, init),
  );

  // When
  await userEvent.press(screen.getByRole("button", { name: "Actualiser" }));

  // Then
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Aucune notification pour le moment"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
      includeHiddenElements: true,
    }),
  ).not.toBeOnTheScreen();

  // When
  rows = [row];
  mockFetch.mockImplementation(response);
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("link", { name: /^Le résultat.*non lue$/ }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
});

it("reloads an accepted empty inbox only from its card and restores pull-to-refresh when rows return", async () => {
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
      busy: true,
    }),
  ).toBeOnTheScreen();
  expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  expect(screen.queryByRole("link")).not.toBeOnTheScreen();
  expect(await screen.findByLabelText("Actualiser les données")).toBeDisabled();

  // When
  await act(async () => pending.resolve(Response.json({ notifications: [] })));

  // Then
  expect(
    await screen.findByText("Aucune notification pour le moment"),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: /supprimer|archiver|restaurer/i }),
  ).toBeNull();
  expect(screen.getByLabelText("Actualiser les données")).toBeDisabled();

  // When
  mockFetch.mockImplementation(response);
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Actualiser" }));

  // Then
  expect(
    await screen.findByRole("link", { name: /non lue$/ }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
  expect(screen.getByLabelText("Actualiser les données")).not.toBeDisabled();
  expect(screen.queryByRole("button", { name: "Actualiser" })).toBeNull();
  expect(mockFetch.mock.calls.every(([, init]) => init.method === "GET")).toBe(
    true,
  );
});

it("keeps accepted notification links while one appended page is pending and reveals its content without a write", async () => {
  // Given: only the generated HTTP continuation is delayed; the real inbox and Query owner remain mounted.
  const pending = Promise.withResolvers<Response>();
  const second = {
    ...row,
    id: "00000000-0000-4000-8000-000000000240",
    title: "Un lien de démonstration est disponible",
  };
  mockFetch.mockImplementation((url: string, init: RequestInit) => {
    const target = new URL(url);
    if (!target.pathname.endsWith("/notifications")) {
      return response(url, init);
    }
    return target.searchParams.has("cursor")
      ? pending.promise
      : Response.json({ notifications: [row], nextCursor: "held-page" });
  });
  await showInbox();
  const first = await screen.findByRole("link", {
    name: /^Le résultat.*non lue$/,
  });

  // When
  await fireEvent(first, "endReached");

  // Then: progress is scoped to the continuation, with the accepted row still available.
  expect(
    await screen.findByRole("progressbar", {
      name: "Chargement de la suite…",
      busy: true,
    }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Chargement de la suite…")).toBeOnTheScreen();
  expect(first).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(url).searchParams.has("cursor"))
      .map(([url]) => new URL(url).searchParams.get("cursor")),
  ).toEqual(["held-page"]);

  // When
  await act(async () =>
    pending.resolve(Response.json({ notifications: [second] })),
  );

  // Then
  expect(
    await screen.findByRole("link", { name: /^Un lien de démonstration/ }),
  ).toBeOnTheScreen();
  expect(first).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, init]) => init.method === "PATCH")).toBe(
    false,
  );
});

it("excludes guest private reads immediately on session invalidation", async () => {
  // Given
  await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  const before = mockFetch.mock.calls.length;

  // When
  await act(async () => {
    await currentSession.clearCredentials();
  });

  // Then
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
  expect(
    mockFetch.mock.calls
      .slice(before)
      .some(([url]) => /notification/.test(url)),
  ).toBe(false);
});

it("loads only the focused inbox and retains rows while its local footer retries the same cursor", async () => {
  // Given
  const second = {
    ...row,
    id: "00000000-0000-4000-8000-000000000239",
    title: "Un lien a été partagé pour suivre le match",
  };
  let failNext = true;
  mockFetch.mockImplementation((url: string, init: RequestInit) => {
    const target = new URL(url);
    if (!target.pathname.endsWith("/notifications")) {
      return response(url, init);
    }
    if (!target.searchParams.has("cursor")) {
      return Promise.resolve(
        Response.json(
          failNext
            ? { notifications: [row], nextCursor: "same-boundary" }
            : { notifications: [second] },
        ),
      );
    }
    if (failNext) {
      return Promise.reject(new TypeError("offline"));
    }
    return Promise.resolve(Response.json({ notifications: [second] }));
  });
  const view = await showInbox();
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
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(screen.getByText("Une erreur est survenue.")).toBeOnTheScreen();

  // When: returning to the tab observes the same failed continuation without restarting page zero.
  const readsBeforeReturn = mockFetch.mock.calls.length;
  mockFocused = false;
  await view.rerender(<NotificationsScreen />);
  mockFocused = true;
  await view.rerender(<NotificationsScreen />);

  // Then
  expect(mockFetch.mock.calls).toHaveLength(readsBeforeReturn);
  expect(screen.getByText("Une erreur est survenue.")).toBeOnTheScreen();

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

it("keeps continuation recovery when accepted pages have no visible notifications", async () => {
  // Given: the accepted server page retains a cursor after its rows are filtered at opening.
  const expired = { ...row, createdAt: "2026-09-01T00:00:00Z" };
  const pending = Promise.withResolvers<Response>();
  let retry = false;
  mockFetch.mockImplementation((url: string, init: RequestInit) => {
    const target = new URL(url);
    if (!target.pathname.endsWith("/notifications")) {
      return response(url, init);
    }
    if (!target.searchParams.has("cursor")) {
      return Promise.resolve(
        Response.json({
          notifications: [expired],
          nextCursor: "filtered-page",
        }),
      );
    }
    return retry ? pending.promise : Promise.reject(new TypeError("offline"));
  });
  await showInbox();
  const user = userEvent.setup();

  // When
  await fireEvent(
    await screen.findByText("Aucune notification pour le moment"),
    "endReached",
  );

  // Then: the retained page set is neither a first-read error nor confirmed exhaustion.
  await screen.findByText("Une erreur est survenue.");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByText("Aucune notification pour le moment")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
  mockFetch.mockClear();
  retry = true;

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await fireEvent(screen.getByText("Chargement de la suite…"), "endReached");

  // Then
  expect(
    screen.getByRole("progressbar", { name: "Chargement de la suite…" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.map(([url]) =>
      new URL(url).searchParams.get("cursor"),
    ),
  ).toEqual(["filtered-page"]);

  // When
  await act(() => pending.resolve(Response.json({ notifications: [row] })));

  // Then
  expect(
    await screen.findByRole("link", { name: /non lue$/ }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Chargement de la suite…")).toBeNull();
});

it("retains an unchanged page past 29 days without an expiry timer or network request", async () => {
  // Given
  rows = [{ ...row, createdAt: new Date(Date.now()).toISOString() }];

  await showInbox();
  await screen.findByRole("link", { name: /non lue$/ });
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
  expect(screen.getByRole("link", { name: /non lue$/ })).toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("waits for foreground before refreshing an expired background inbox", async () => {
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

it("keeps a full-read error when foreground filters expired rows until explicit Retry succeeds", async () => {
  // Given: the retained row expires after a full read has already failed.
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
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? Promise.reject(new TypeError("Failed full read"))
      : response(url, init),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert", { name: "Une erreur est survenue" });
  jest.setSystemTime(Date.now() + 2000);
  const fresh = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    new URL(url).pathname.endsWith("/notifications")
      ? fresh.promise
      : response(url, init),
  );

  const beforeForeground = mockFetch.mock.calls.filter(([url]) =>
    new URL(url).pathname.endsWith("/notifications"),
  ).length;

  // When
  await act(async () => {
    listeners.forEach((listener) => listener("active"));
    await jest.advanceTimersByTimeAsync(0);
  });

  // Then: local cleanup is no successful server response or automatic retry.
  expect(
    screen.getByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aucune notification pour le moment")).toBeNull();
  expect(
    privateClient.getQueryState([`/accounts/${row.id}/notifications`]),
  ).toMatchObject({ status: "error", fetchStatus: "idle" });
  expect(
    privateClient.getQueryData<InboxData>([`/accounts/${row.id}/notifications`])
      ?.pages[0].notifications,
  ).toEqual([]);

  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/notifications"),
    ),
  ).toHaveLength(beforeForeground);

  // When: the failed native query is retried only by its explicit action.
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    screen.getByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeBusy();
  expect(
    privateClient.getQueryState([`/accounts/${row.id}/notifications`]),
  ).toMatchObject({ status: "error", fetchStatus: "fetching" });

  // When
  await act(async () => fresh.resolve(Response.json({ notifications: [] })));

  // Then
  expect(
    await screen.findByText("Aucune notification pour le moment"),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
});

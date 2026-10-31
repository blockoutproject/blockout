import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import * as Notifications from "expo-notifications";
import { PermissionStatus } from "expo";
import { useAccessAdmission } from "../../access/queries/use-access-admission";
import { NotificationLifecycle } from "../native/notification-lifecycle";
import { createPushRegistration } from "../native/push-registration";
import { NotificationState } from "../state/notification-state";
import {
  AccountSessionProvider,
  useAccountSession,
  type AccountSession,
} from "../../accounts/session/account-session-provider";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import { createQueryClient } from "../../../shared/query/query-client";
import { notificationResponse } from "../test-support/notification-data";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
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
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRootNavigationState: () => ({ key: "root" }),
  useRouter: () => ({ push: mockOpen }),
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { easConfig: { projectId: "synthetic-project" } },
}));
jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "default",
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: false, canAskAgain: false }),
  getExpoPushTokenAsync: jest
    .fn()
    .mockResolvedValue({ type: "expo", data: "ExponentPushToken[synthetic]" }),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  getPresentedNotificationsAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
}));
const mockFetch = jest.fn();
const mockOpen = jest.fn();
// Capture process setup before F14 initialization can delay rendering of the lifecycle component.
const foregroundHandler = jest.mocked(Notifications.setNotificationHandler).mock
  .calls[0]?.[0];
const env = { ...process.env };
const row = notificationResponse();
const ownerId = "00000000-0000-4000-8000-000000000001";
let client = createQueryClient();
let privateClient: ReturnType<typeof createQueryClient>;
let session: AccountSession;
let push = createPushRegistration();

/** Synthetic native response with only canonical routing IDs; text and platform presentation stay SDK-owned. */
function response(
  ownerAccountId = ownerId,
): Notifications.NotificationResponse {
  return {
    actionIdentifier: "default",
    notification: {
      date: Date.now(),
      request: {
        identifier: "system-response",
        trigger: { type: "push" },
        content: {
          title: null,
          subtitle: null,
          body: null,
          categoryIdentifier: null,
          sound: null,
          launchImageName: null,
          badge: null,
          attachments: [],
          threadIdentifier: null,
          data: {
            ownerAccountId,
            notificationId: row.id,
            matchId: row.match.id,
          },
        },
      },
    },
  };
}

/** Real session, Query transport, inbox and badge consumers; native events and navigation are boundary doubles. */
function Capture() {
  const current = useAccountSession();
  const access = useAccessAdmission();
  const cache = useQueryClient();
  useLayoutEffect(() => {
    privateClient = cache;
  }, [cache]);
  useLayoutEffect(() => {
    session = current;
  });
  return (
    <AccountFeedbackProvider>
      <NotificationState>
        <NotificationLifecycle registration={push} enabled={access.ordinary} />
      </NotificationState>
    </AccountFeedbackProvider>
  );
}
/** Mirrors the existing root theme/feedback/session ownership with controlled SDK/network boundaries. */
function Root() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ApplicationAccessProvider>
          <AccountSessionProvider preparePushRemoval={push.prepareRemoval}>
            <AdvertisingProviders>
              <Capture />
            </AdvertisingProviders>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-28T12:00:00Z") });
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "synthetic-mobile";
  client = createQueryClient();
  push = createPushRegistration();
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("synthetic-owner"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  jest
    .mocked(Notifications.getLastNotificationResponse)
    .mockReset()
    .mockReturnValue(null);
  jest.mocked(Notifications.clearLastNotificationResponse).mockClear();
  jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mockClear();
  jest.mocked(Notifications.addNotificationReceivedListener).mockClear();
  mockOpen.mockReset();
  jest.mocked(Notifications.getPermissionsAsync).mockReset().mockResolvedValue({
    granted: false,
    canAskAgain: false,
    status: PermissionStatus.DENIED,
    expires: "never",
  });
  jest
    .mocked(Notifications.getExpoPushTokenAsync)
    .mockReset()
    .mockResolvedValue({ type: "expo", data: "ExponentPushToken[synthetic]" });
  mockFetch
    .mockReset()
    .mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith("application-access"))
        return Response.json(applicationAccessResponse());
      if (url.endsWith("accounts/me"))
        return Response.json(accountResponse({ accountId: ownerId }));
      if (url.endsWith("notification-summary"))
        return Response.json({ unreadCount: 0 });
      if (init.method === "PUT" && url.includes("push-subscriptions"))
        return Response.json({
          id: url.split("/").at(-1),
          installationId: JSON.parse(String(init.body)).installationId,
        });
      if (url.endsWith(`/notifications/${row.id}`) && init.method === "PATCH")
        return Response.json({ ...row, read: true });
      throw new Error("Unexpected synthetic boundary");
    });
});

it("uses a native token change only to reacquire the Expo address for the same connection", async () => {
  // Given
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: PermissionStatus.GRANTED,
    expires: "never",
  });
  await render(<Root />);
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PUT"),
    ).toHaveLength(1),
  );
  const changed = jest
    .mocked(Notifications.addPushTokenListener)
    .mock.calls.at(-1)?.[0];
  if (!changed) throw new Error("Token listener must be registered");

  // When
  await act(async () =>
    changed({ type: "ios", data: "APNS[synthetic-native-token]" }),
  );

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PUT"),
    ).toHaveLength(2),
  );
  const requests = mockFetch.mock.calls.filter(
    ([, init]) => init.method === "PUT",
  );
  expect(requests[0][0]).toBe(requests[1][0]);
  expect(JSON.parse(requests[1][1].body).expoPushToken).toBe(
    "ExponentPushToken[synthetic]",
  );
});
afterEach(async () => {
  await cleanup();
  await privateClient?.cancelQueries();
  client.clear();
  privateClient?.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  process.env = { ...env };
  jest.restoreAllMocks();
});

it("sets explicit foreground silence and refreshes summary without creating an alert", async () => {
  // Given
  await render(<Root />);
  await waitFor(() => expect(session.accountId).toBe(ownerId));
  const handler = foregroundHandler;
  const receive = jest
    .mocked(Notifications.addNotificationReceivedListener)
    .mock.calls.at(-1)?.[0];
  if (!handler || !receive) throw new Error("SDK listeners must be registered");
  const before = mockFetch.mock.calls.filter(([url]) =>
    url.endsWith("notification-summary"),
  ).length;

  // When
  const behavior = await handler.handleNotification(response().notification);
  await act(async () => receive(response().notification));

  // Then
  expect(behavior).toEqual({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  });
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        url.endsWith("notification-summary"),
      ).length,
    ).toBeGreaterThan(before),
  );
  expect(mockOpen).not.toHaveBeenCalled();
  expect(Notifications.getPresentedNotificationsAsync).not.toHaveBeenCalled();
  expect(Notifications.dismissAllNotificationsAsync).not.toHaveBeenCalled();
});

it("handles cold response and duplicate tap once, clears it, and reads even if navigation fails", async () => {
  // Given
  jest
    .mocked(Notifications.getLastNotificationResponse)
    .mockReturnValue(response());
  mockOpen.mockImplementation(() => {
    throw new Error("Navigation unavailable");
  });
  await render(<Root />);
  await waitFor(() => expect(session.accountId).toBe(ownerId));
  const tap = jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mock.calls.at(-1)?.[0];
  if (!tap) throw new Error("Tap listener must be registered");

  // When
  await act(async () => tap(response()));

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1),
  );
  expect(mockOpen).toHaveBeenCalledTimes(1);
  expect(mockOpen).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: row.match.id },
  });
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
});

it("installs foreground silence before asynchronous installation initialization finishes", async () => {
  // Given
  const initialized = Promise.withResolvers<void>();
  jest.mocked(initializeV2Installation).mockReturnValue(initialized.promise);

  // When
  await render(<Root />);

  // Then
  expect(foregroundHandler).toBeDefined();
  expect(
    await foregroundHandler?.handleNotification(response().notification),
  ).toEqual({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  });
  await act(async () => initialized.resolve());
});

it("reports a failed read action without cancelling its successful match navigation", async () => {
  // Given
  const ordinary = mockFetch.getMockImplementation();
  if (!ordinary) throw new Error("Synthetic HTTP boundary is required");
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    url.includes(`/notifications/${row.id}`)
      ? Promise.resolve(new Response(null, { status: 503 }))
      : ordinary(url, init),
  );
  jest
    .mocked(Notifications.getLastNotificationResponse)
    .mockReturnValue(response());

  // When
  await render(<Root />);

  // Then
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
  expect(mockOpen).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
  ).toHaveLength(1);
});

it("keeps a failed passive receive refresh discreet", async () => {
  // Given
  await render(<Root />);
  await waitFor(() => expect(session.accountId).toBe(ownerId));
  const receive = jest
    .mocked(Notifications.addNotificationReceivedListener)
    .mock.calls.at(-1)?.[0];
  if (!receive) throw new Error("Receive listener must be registered");
  const ordinary = mockFetch.getMockImplementation();
  if (!ordinary) throw new Error("Synthetic HTTP boundary is required");
  const before = mockFetch.mock.calls.filter(([url]) =>
    url.endsWith("notification-summary"),
  ).length;
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    url.endsWith("notification-summary")
      ? Promise.resolve(new Response(null, { status: 503 }))
      : ordinary(url, init),
  );

  // When
  await act(async () => receive(response().notification));

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        url.endsWith("notification-summary"),
      ).length,
    ).toBeGreaterThan(before),
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect(mockOpen).not.toHaveBeenCalled();
});

it("converts a token event without recursively reacquiring the native token", async () => {
  // Given: native acquisition emits the listener; the SDK devicePushToken option skips that acquisition.
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: PermissionStatus.GRANTED,
    expires: "never",
  });
  let acquisitions = 0;
  jest
    .mocked(Notifications.getExpoPushTokenAsync)
    .mockImplementation(async (options) => {
      if (!options?.devicePushToken && ++acquisitions <= 3) {
        const listener = jest
          .mocked(Notifications.addPushTokenListener)
          .mock.calls.at(-1)?.[0];
        listener?.({ type: "ios", data: "APNS[synthetic]" });
      }
      return { type: "expo", data: "ExponentPushToken[synthetic]" };
    });

  // When
  await render(<Root />);

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PUT"),
    ).toHaveLength(1),
  );
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(2);
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenLastCalledWith({
    projectId: "synthetic-project",
    devicePushToken: { type: "ios", data: "APNS[synthetic]" },
  });
});

it.each(["guest", "other-account"])(
  "opens an old %s tap through public match navigation without reading the former inbox",
  async (kind) => {
    // Given
    if (kind === "guest")
      mockAuth0.hasValidCredentials.mockResolvedValue(false);
    await render(<Root />);
    await waitFor(() =>
      expect(session.status).toBe(kind === "guest" ? "guest" : "authenticated"),
    );
    await waitFor(() =>
      expect(
        Notifications.addNotificationResponseReceivedListener,
      ).toHaveBeenCalled(),
    );
    const tap = jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mock.calls.at(-1)?.[0];
    if (!tap) throw new Error("Tap listener must be registered");

    // When
    await act(async () =>
      tap(response("00000000-0000-4000-8000-000000000099")),
    );

    // Then
    await waitFor(() => expect(mockOpen).toHaveBeenCalledTimes(1));
    expect(
      mockFetch.mock.calls.some(([url]) =>
        url.includes(`/accounts/00000000-0000-4000-8000-000000000099/`),
      ),
    ).toBe(false);
    expect(
      mockFetch.mock.calls.some(([, init]) => init.method === "PATCH"),
    ).toBe(false);
  },
);

it("removes native subscriptions and clears the badge after sign-out", async () => {
  // Given
  await render(<Root />);
  await waitFor(() => expect(session.accountId).toBe(ownerId));
  await waitFor(() =>
    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled(),
  );
  const subscription = jest
    .mocked(Notifications.addNotificationReceivedListener)
    .mock.results.at(-1)?.value;
  // When
  await act(async () => session.signOut());
  await waitFor(() => expect(session.status).toBe("guest"));
  // Then
  expect(subscription?.remove).toHaveBeenCalledTimes(1);
  expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
});

it("leaves an old system tap blocked by current maintenance without reading or navigating", async () => {
  // Given: the real admission and lifecycle owners consume a controlled current F12 response.
  const ordinary = mockFetch.getMockImplementation();
  if (!ordinary) throw new Error("Synthetic HTTP implementation is required");
  const access = applicationAccessResponse();
  access.maintenance.active = true;
  mockFetch.mockImplementation((url: string, init: RequestInit) =>
    url.endsWith("application-access")
      ? Promise.resolve(Response.json(access))
      : ordinary(url, init),
  );
  jest
    .mocked(Notifications.getLastNotificationResponse)
    .mockReturnValue(response());

  // When
  await render(<Root />);
  await waitFor(() => expect(session.status).toBe("authenticated"));

  // Then
  expect(
    mockFetch.mock.calls.some(([url]) => url.endsWith("application-access")),
  ).toBe(true);
  expect(mockFetch.mock.calls.some(([, init]) => init.method === "PATCH")).toBe(
    false,
  );
  expect(mockOpen).not.toHaveBeenCalled();
  expect(
    Notifications.addNotificationResponseReceivedListener,
  ).not.toHaveBeenCalled();
  expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
});

import { act, cleanup, render, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import * as Notifications from "expo-notifications";
import { PermissionStatus } from "expo";
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
import {
  bindSessionQueries,
  createQueryClient,
} from "../../../shared/query/query-client";
import { notificationResponse } from "../test-support/notification-data";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
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
jest.mock("expo-router", () => ({
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
const env = { ...process.env };
const row = notificationResponse();
const ownerId = "00000000-0000-4000-8000-000000000001";
let client = createQueryClient();
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
  useLayoutEffect(() => {
    session = current;
  });
  useLayoutEffect(
    () => bindSessionQueries(client, current.subscribe, current.isCurrent),
    [current.subscribe, current.isCurrent],
  );
  return (
    <NotificationState>
      <NotificationLifecycle registration={push} enabled />
    </NotificationState>
  );
}
function Root() {
  return (
    <QueryClientProvider client={client}>
      <ApplicationAccessProvider>
        <AccountSessionProvider preparePushRemoval={push.prepareRemoval}>
          <Capture />
        </AccountSessionProvider>
      </ApplicationAccessProvider>
    </QueryClientProvider>
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
  await client.cancelQueries();
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  process.env = { ...env };
  jest.restoreAllMocks();
});

it("sets explicit foreground silence and refreshes summary without creating an alert", async () => {
  // Given
  await render(<Root />);
  await waitFor(() => expect(session.accountId).toBe(ownerId));
  const handler = jest
    .mocked(Notifications.setNotificationHandler)
    .mock.calls.at(-1)?.[0];
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
    const tap = jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mock.calls.at(-1)?.[0];
    if (!tap) throw new Error("Tap listener must be registered");

    // When
    await act(async () =>
      tap(response("00000000-0000-4000-8000-000000000099")),
    );

    // Then
    expect(mockOpen).toHaveBeenCalledTimes(1);
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

it("discards the old receive callback after sign-out", async () => {
  // Given
  await render(<Root />);
  await waitFor(() => expect(session.accountId).toBe(ownerId));
  const receive = jest
    .mocked(Notifications.addNotificationReceivedListener)
    .mock.calls.at(-1)?.[0];
  if (!receive) throw new Error("Receive listener must be registered");
  await act(async () => session.signOut());
  const before = mockFetch.mock.calls.length;

  // When
  await act(async () => receive(response().notification));

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(before);
  expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
});

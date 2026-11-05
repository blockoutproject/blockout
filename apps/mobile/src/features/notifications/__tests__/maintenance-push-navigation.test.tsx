import { act, cleanup, fireEvent, screen } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter, testRouter } from "expo-router/testing-library";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import type { ComponentType } from "react";
import RootLayout from "../../../app/_layout";
import MatchRoute from "../../../app/(ordinary)/matches/[matchId]";
import { AccessGateScreen } from "../../access/screens/access-gate-screen";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { completeDiscovery } from "../../onboarding/discovery-state";
import { submitAgeDeclaration } from "../../advertising/age-declaration";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import * as proSessionModule from "../../pro/pro-session";
import { notificationResponse } from "../test-support/notification-data";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
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
  DEFAULT_ACTION_IDENTIFIER: "default",
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: false, canAskAgain: false }),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
}));

const mockFetch = jest.fn();
const environment = { ...process.env };
const row = notificationResponse();
const ownerId = "00000000-0000-4000-8000-000000000272";

/** A remembered SDK tap carries original routing IDs, never an admission decision or a current match representation. */
function oldPush(): Notifications.NotificationResponse {
  return {
    actionIdentifier: "default",
    notification: {
      date: new Date("2026-10-27T11:00:00Z").getTime(),
      request: {
        identifier: "before-maintenance",
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
            ownerAccountId: ownerId,
            notificationId: row.id,
            matchId: row.match.id,
          },
        },
      },
    },
  };
}

/** Mounts production root guards, SDK lifecycle and the current F03 match route; unrelated destinations are probes. */
async function openApplication() {
  return renderRouter({
    _layout: () => <RootLayout />,
    access: AccessGateScreen,
    onboarding: () => <Text>Discovery</Text>,
    "age-declaration": () => <Text>Age declaration</Text>,
    "(ordinary)/_layout": () => (
      <Stack screenOptions={{ headerShown: false }} />
    ),
    "(ordinary)/index": () => <Text>Ordinary home</Text>,
    "(ordinary)/matches/[matchId]": MatchRoute,
    "(operations)/_layout": () => <Stack />,
    "(operations)/administration": () => <Text>Administration</Text>,
  });
}

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "synthetic-mobile",
  });
  await AsyncStorage.clear();
  await completeDiscovery();
  await submitAgeDeclaration(30);
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("synthetic-owner"));
  jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mockClear();
  jest.mocked(Notifications.clearLastNotificationResponse).mockClear();
  jest
    .mocked(Notifications.getLastNotificationResponse)
    .mockReset()
    .mockReturnValue(oldPush());
  mockFetch.mockReset();
});

afterEach(async () => {
  await cleanup();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it.each(["owner", "operator", "guest"] as const)(
  "keeps an old %s push behind current maintenance and minimum-version gates",
  async (actor) => {
    // Given: the native version is 2.9.0; maintenance and the newer minimum are independently current.
    const access = applicationAccessResponse();
    access.maintenance = {
      revision: 1,
      active: true,
      message: "Maintenance en cours.",
      imageUrl: null,
    };
    access.versions.ios = {
      minimumVersion: "2.10.0",
      storeUrl: "https://apps.apple.com/app/id123",
    };
    access.versions.android = {
      minimumVersion: "2.10.0",
      storeUrl: "https://play.google.com/store/apps/details?id=com.blockout",
    };
    if (actor === "guest")
      mockAuth0.hasValidCredentials.mockResolvedValue(false);
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.endsWith("application-access")) return Response.json(access);
      if (path.endsWith("accounts/me"))
        return Response.json(
          accountResponse({
            accountId: ownerId,
            permissions:
              actor === "operator"
                ? { manageMaintenance: true, bypassMaintenance: true }
                : {},
          }),
        );
      if (path.endsWith("notification-summary"))
        return Response.json({ unreadCount: 0 });
      if (path.endsWith(`/notifications/${row.id}`) && init.method === "PATCH")
        return Response.json({ ...row, read: true });
      if (path.endsWith(`/matches/${row.match.id}`))
        return Response.json({ match: row.match, documents: [] });
      throw new Error(`Unexpected synthetic boundary ${path}`);
    });

    // When
    await openApplication();

    // Then: even a current bypass grant neither chooses personal bypass nor bypasses the minimum.
    expect(
      await screen.findByRole("header", {
        name: "Blockout est en maintenance",
      }),
    ).toBeOnTheScreen();
    expect(screen).toHavePathname("/access");
    expect(
      screen.queryByRole("link", { name: "Accès administrateur" }),
    ).toBeNull();
    expect(
      Notifications.addNotificationResponseReceivedListener,
    ).not.toHaveBeenCalled();
    expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.some(([url]) =>
        /\/matches\/|\/notifications\//.test(url),
      ),
    ).toBe(false);

    // When: lifting maintenance alone still leaves the current minimum in force.
    access.maintenance = {
      revision: 2,
      active: false,
      message: null,
      imageUrl: null,
    };
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    expect(
      await screen.findByRole("header", { name: "Mets Blockout à jour." }),
    ).toBeOnTheScreen();
    expect(screen).toHavePathname("/access");
    expect(
      Notifications.addNotificationResponseReceivedListener,
    ).not.toHaveBeenCalled();
    expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.some(([url]) =>
        /\/matches\/|\/notifications\//.test(url),
      ),
    ).toBe(false);

    // When: a later complete read satisfies both gates; the remembered tap then uses ordinary navigation.
    access.versions.ios = { minimumVersion: null, storeUrl: null };
    access.versions.android = { minimumVersion: null, storeUrl: null };
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then: the real destination fetches its current representation and the owner read is independent.
    expect(
      await screen.findByRole("header", { name: "Informations" }),
    ).toBeOnTheScreen();
    expect(screen).toHavePathname(`/matches/${row.match.id}`);
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(
      1,
    );
    const commands = mockFetch.mock.calls.filter(
      ([, init]) => init.method === "PATCH",
    );
    expect(commands).toHaveLength(actor === "guest" ? 0 : 1);
    if (actor !== "guest")
      expect(JSON.parse(commands[0][1].body)).toEqual({ read: true });
    expect(
      mockFetch.mock.calls.some(([url]) =>
        new URL(url).pathname.endsWith(`/matches/${row.match.id}`),
      ),
    ).toBe(true);

    // When: a duplicate SDK tap is delivered after ordinary admission.
    const tap = jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mock.calls.at(-1)?.[0];
    if (!tap) throw new Error("The native response listener must be mounted");
    await act(async () => tap(oldPush()));

    // Then: consuming a remembered tap is not a provider resend or personal-entry recreation.
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(
      1,
    );
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(actor === "guest" ? 0 : 1);
    expect(
      mockFetch.mock.calls.some(([, init]) => init.method === "POST"),
    ).toBe(false);
  },
);

it("opens an old tap from an admitted operational destination", async () => {
  // Given: inactive maintenance permits ordinary navigation while the current manager visits administration.
  jest.mocked(Notifications.getLastNotificationResponse).mockReturnValue(null);
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    if (path.endsWith("application-access"))
      return Response.json(applicationAccessResponse());
    if (path.endsWith("accounts/me"))
      return Response.json(
        accountResponse({
          accountId: ownerId,
          permissions: { manageMaintenance: true },
        }),
      );
    if (path.endsWith("notification-summary"))
      return Response.json({ unreadCount: 0 });
    if (path.endsWith(`/notifications/${row.id}`) && init.method === "PATCH")
      return Response.json({ ...row, read: true });
    if (path.endsWith(`/matches/${row.match.id}`))
      return Response.json({ match: row.match, documents: [] });
    throw new Error(`Unexpected synthetic boundary ${path}`);
  });
  await openApplication();
  await screen.findByText("Ordinary home");
  await testRouter.push("/administration");
  await screen.findByText("Administration");
  const tap = jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mock.calls.at(-1)?.[0];
  if (!tap) throw new Error("The native response listener must be mounted");

  // When
  await act(async () => tap(oldPush()));

  // Then: operational navigation has no extra tap restriction when ordinary admission is satisfied.
  expect(
    await screen.findByRole("header", { name: "Informations" }),
  ).toBeOnTheScreen();
  expect(screen).toHavePathname(`/matches/${row.match.id}`);
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
  ).toHaveLength(1);
});

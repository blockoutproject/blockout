import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter, testRouter } from "expo-router/testing-library";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Text } from "react-native";
import { useEffect, type ComponentType } from "react";
import RootLayout from "@/app/_layout";
import EntryRoute from "@/app/index";
import OrdinaryLayout from "@/app/(ordinary)/_layout";
import RecoveryLayout from "@/app/(recovery)/_layout";
import SignInRoute from "@/app/(recovery)/sign-in";
import MatchRoute from "@/app/(ordinary)/(tabs)/(discovery,home,notifications,profile)/matches/[matchId]";
import { AccessGateScreen } from "@/features/access/screens/access-gate-screen";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import {
  useAccountSession,
  type AccountSession,
} from "@/features/accounts/current-account";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { completeDiscovery } from "@/features/onboarding/discovery-state";
import { prepareProNativeIO } from "@/features/pro/test-support/pro-harness";
import * as proSessionModule from "@/features/pro/pro-session";
import { notificationResponse } from "../test-support/notification-data";
import { nativeNotificationResponse } from "../test-support/native-notification-data";

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
let destinationSession: AccountSession | undefined;

/** Observes the public session contract at the real match destination without replacing its providers. */
function MatchDestination() {
  const session = useAccountSession();
  useEffect(() => {
    destinationSession = session;
  }, [session]);
  return <MatchRoute />;
}

/** Keeps the real root/ordinary admission and F03 destination; unrelated route bodies are probes. */
async function openApplication() {
  return renderRouter({
    _layout: () => <RootLayout />,
    index: EntryRoute,
    access: AccessGateScreen,
    onboarding: () => <Text>Discovery</Text>,
    "(ordinary)/_layout": OrdinaryLayout,
    "(ordinary)/(tabs)/_layout": () => <Stack />,
    "(ordinary)/(tabs)/(home)/(personal)/index": () => (
      <Text>Ordinary home</Text>
    ),
    "(ordinary)/pro": () => <Text>Pro</Text>,
    "(ordinary)/sign-in-invitation": () => <Text>Sign-in invitation</Text>,
    "(ordinary)/matches/[matchId]": MatchDestination,
    "(recovery)/_layout": RecoveryLayout,
    "(recovery)/sign-in": SignInRoute,
    "(recovery)/support/index": () => <Text>Support</Text>,
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
    .mockReturnValue(
      nativeNotificationResponse(
        "before-maintenance",
        new Date("2026-10-27T11:00:00Z").getTime(),
        {
          ownerAccountId: ownerId,
          notificationId: row.id,
          matchId: row.match.id,
        },
      ),
    );
  mockFetch.mockReset();
  destinationSession = undefined;
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
    if (actor === "guest") {
      mockAuth0.hasValidCredentials.mockResolvedValue(false);
    }
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.endsWith("application-access")) {
        return Response.json(access);
      }
      if (path.endsWith("accounts/me")) {
        return Response.json(
          accountResponse({
            accountId: ownerId,
            permissions:
              actor === "operator"
                ? { manageMaintenance: true, bypassMaintenance: true }
                : {},
          }),
        );
      }
      if (
        path.endsWith(`/notifications/${row.id}`) &&
        init.method === "PATCH"
      ) {
        return Response.json({ ...row, read: true });
      }
      if (path.endsWith(`/matches/${row.match.id}`)) {
        return Response.json({ match: row.match, documents: [] });
      }
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

    if (actor === "guest") {
      // No restored SDK identity means ordinary Login; only explicit guest continuation enters public navigation.
      await userEvent.press(
        await screen.findByRole("button", {
          name: "Continuer en tant qu’invité",
        }),
      );
    }

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
    if (actor !== "guest") {
      expect(JSON.parse(commands[0][1].body)).toEqual({ read: true });
    }
    expect(
      mockFetch.mock.calls.some(([url]) =>
        new URL(url).pathname.endsWith(`/matches/${row.match.id}`),
      ),
    ).toBe(true);

    // When: a duplicate SDK tap is delivered after ordinary admission.
    const tap = jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mock.calls.at(-1)?.[0];
    if (!tap) {
      throw new Error("The native response listener must be mounted");
    }
    await act(async () =>
      tap(
        nativeNotificationResponse(
          "before-maintenance",
          new Date("2026-10-27T11:00:00Z").getTime(),
          {
            ownerAccountId: ownerId,
            notificationId: row.id,
            matchId: row.match.id,
          },
        ),
      ),
    );

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

it.each(["pending", "failed"] as const)(
  "opens the remembered public Match while the first account read is %s without deferring a private action",
  async (outcome) => {
    // Given: the actual root and public Match route remain real while account HTTP completion is controlled.
    const firstAccountRead = Promise.withResolvers<Response>();
    let readAccount = () => firstAccountRead.promise;
    const foreground = jest.spyOn(AppState, "addEventListener");
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.endsWith("application-access")) {
        return Response.json(applicationAccessResponse());
      }
      if (path.endsWith("accounts/me")) {
        return readAccount();
      }
      if (
        path.endsWith(`/notifications/${row.id}`) &&
        init.method === "PATCH"
      ) {
        return Response.json({ ...row, read: true });
      }
      if (path.endsWith(`/matches/${row.match.id}`)) {
        return Response.json({ match: row.match, documents: [] });
      }
      throw new Error(`Unexpected synthetic boundary ${path}`);
    });

    try {
      // When
      await openApplication();

      // Then: resolved native identity admits the exact public destination before the account UUID.
      expect(
        await screen.findByRole("header", { name: "Informations" }),
      ).toBeOnTheScreen();
      expect(screen).toHavePathname(`/matches/${row.match.id}`);
      expect(destinationSession).toMatchObject({
        status: "authenticated",
        subject: "synthetic-owner",
        accountId: null,
      });
      expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(
        1,
      );
      expect(
        mockFetch.mock.calls.some(([, init]) => init.method === "PATCH"),
      ).toBe(false);

      // When: a technical failure changes only the independent account read.
      if (outcome === "failed") {
        readAccount = async () => new Response(null, { status: 503 });
        await act(() =>
          firstAccountRead.resolve(new Response(null, { status: 503 })),
        );
        await act(() => jest.advanceTimersByTimeAsync(8000));
      }

      // Then
      expect(screen).toHavePathname(`/matches/${row.match.id}`);
      expect(
        screen.getByRole("header", { name: "Informations" }),
      ).toBeOnTheScreen();
      expect(
        mockFetch.mock.calls.some(([, init]) => init.method === "PATCH"),
      ).toBe(false);

      // When: later account success supplies the current matching owner, through ordinary foreground refresh after failure.
      readAccount = async () =>
        Response.json(accountResponse({ accountId: ownerId }));
      await act(async () => {
        firstAccountRead.resolve(
          Response.json(accountResponse({ accountId: ownerId })),
        );
        if (outcome === "failed") {
          for (const [event, listener] of foreground.mock.calls) {
            if (event === "change") {
              listener("active");
            }
          }
        }
      });
      await waitFor(() => expect(destinationSession?.accountId).toBe(ownerId));

      // Then: the consumed tap remains public navigation, without delayed ACK or login/creation.
      expect(screen).toHavePathname(`/matches/${row.match.id}`);
      expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(
        1,
      );
      expect(
        mockFetch.mock.calls.some(([, init]) =>
          ["PATCH", "POST"].includes(init.method),
        ),
      ).toBe(false);
      expect(mockAuth0.webAuth).not.toHaveBeenCalled();
      expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    } finally {
      await act(() =>
        firstAccountRead.resolve(
          Response.json(accountResponse({ accountId: ownerId })),
        ),
      );
    }
  },
);

it("keeps admitted operational history through a technical reread before opening an old tap", async () => {
  // Given: inactive maintenance permits ordinary navigation while the current manager visits administration.
  jest.mocked(Notifications.getLastNotificationResponse).mockReturnValue(null);
  const nativeState = jest.spyOn(AppState, "addEventListener");
  let accountAvailable = true;
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    if (path.endsWith("application-access")) {
      return Response.json(applicationAccessResponse());
    }
    if (path.endsWith("accounts/me")) {
      if (!accountAvailable) {
        return new Response(null, { status: 503 });
      }
      return Response.json(
        accountResponse({
          accountId: ownerId,
          permissions: { manageMaintenance: true },
        }),
      );
    }
    if (path.endsWith(`/notifications/${row.id}`) && init.method === "PATCH") {
      return Response.json({ ...row, read: true });
    }
    if (path.endsWith(`/matches/${row.match.id}`)) {
      return Response.json({ match: row.match, documents: [] });
    }
    throw new Error(`Unexpected synthetic boundary ${path}`);
  });
  await openApplication();
  await screen.findByText("Ordinary home");
  await testRouter.push("/administration");
  await screen.findByText("Administration");

  // When: foreground restoration cannot reread the previously confirmed account.
  accountAvailable = false;
  await act(async () => {
    for (const [event, listener] of nativeState.mock.calls) {
      if (event === "change") {
        listener("active");
      }
    }
    await jest.advanceTimersByTimeAsync(8000);
  });

  // Then: a technical failure keeps the admitted operational destination and its native tap listener.
  expect(screen).toHavePathname("/administration");
  expect(screen.getByText("Administration")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => url.endsWith("accounts/me")).length,
  ).toBeGreaterThan(1);
  const tap = jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mock.calls.at(-1)?.[0];
  if (!tap) {
    throw new Error("The native response listener must be mounted");
  }

  // When
  await act(async () =>
    tap(
      nativeNotificationResponse(
        "before-maintenance",
        new Date("2026-10-27T11:00:00Z").getTime(),
        {
          ownerAccountId: ownerId,
          notificationId: row.id,
          matchId: row.match.id,
        },
      ),
    ),
  );

  // Then: operational navigation has no extra tap restriction when ordinary admission is satisfied.
  expect(
    await screen.findByRole("header", { name: "Informations" }),
  ).toBeOnTheScreen();
  expect(screen).toHavePathname(`/matches/${row.match.id}`);
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
  ).toHaveLength(1);

  // When
  await testRouter.back();

  // Then: opening the public destination did not replace the operational caller's retained history.
  expect(await screen.findByText("Administration")).toBeOnTheScreen();
  expect(screen).toHavePathname("/administration");
});

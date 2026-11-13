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
import RootLayout from "../../../app/_layout";
import OrdinaryLayout from "../../../app/(ordinary)/_layout";
import RecoveryLayout from "../../../app/(recovery)/_layout";
import MatchRoute from "../../../app/(ordinary)/(tabs)/(discovery,home,notifications,profile)/matches/[matchId]";
import { AccessGateScreen } from "../../access/screens/access-gate-screen";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  useAccountSession,
  type AccountSession,
} from "../../accounts/current-account";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { completeDiscovery } from "../../onboarding/discovery-state";
import { submitAgeDeclaration } from "../../advertising/age-declaration";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import * as proSessionModule from "../../pro/pro-session";
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
let destinationSession: AccountSession | undefined;

/** Observes the public session contract at the real match destination without replacing its providers. */
function MatchDestination() {
  const session = useAccountSession();
  useEffect(() => {
    destinationSession = session;
  }, [session]);
  return <MatchRoute />;
}

/** Keeps the real root/member admission and F03 destination; unrelated route bodies are probes. */
async function openApplication() {
  return renderRouter({
    _layout: () => <RootLayout />,
    access: AccessGateScreen,
    onboarding: () => <Text>Discovery</Text>,
    "age-declaration": () => <Text>Age declaration</Text>,
    "(ordinary)/_layout": OrdinaryLayout,
    "(ordinary)/(tabs)/_layout": () => <Stack />,
    "(ordinary)/(tabs)/index": () => <Text>Ordinary home</Text>,
    "(ordinary)/privacy": () => <Text>Privacy</Text>,
    "(ordinary)/privacy-age": () => <Text>Privacy age</Text>,
    "(ordinary)/pro": () => <Text>Pro</Text>,
    "(ordinary)/sign-in-invitation": () => <Text>Sign-in invitation</Text>,
    "(ordinary)/matches/[matchId]": MatchDestination,
    "(recovery)/_layout": RecoveryLayout,
    "(recovery)/sign-in": () => <Text>Sign-in</Text>,
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
      if (path.endsWith("notification-summary")) {
        return Response.json({ unreadCount: 0 });
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

it.each([
  { recovery: "retry", accountId: ownerId, acknowledgements: 1 },
  {
    recovery: "retry",
    accountId: "00000000-0000-4000-8000-000000000273",
    acknowledgements: 0,
  },
  { recovery: "guest", accountId: ownerId, acknowledgements: 0 },
] as const)(
  "holds the remembered tap until $recovery releases initial account failure for $accountId",
  async ({ recovery, accountId, acknowledgements }) => {
    // Given: the native tap is remembered while the first account read has no usable result.
    const firstAccountRead = Promise.withResolvers<Response>();
    let readAccount = () => firstAccountRead.promise;
    const user = userEvent.setup();
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.endsWith("application-access")) {
        return Response.json(applicationAccessResponse());
      }
      if (path.endsWith("accounts/me")) {
        return readAccount();
      }
      if (path.endsWith("notification-summary")) {
        return Response.json({ unreadCount: 0 });
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
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(([url]) => url.endsWith("accounts/me")),
      ).toBe(true),
    );

    // Then: pending membership cannot consume the SDK response or enter the public destination.
    expect(
      await screen.findByRole("progressbar", {
        name: "Chargement en cours",
      }),
    ).toBeOnTheScreen();
    expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
    expect(screen.queryByText("Ordinary home")).toBeNull();
    expect(
      mockFetch.mock.calls.some(([url]) =>
        /\/matches\/|\/notifications\//.test(url),
      ),
    ).toBe(false);

    // When: native Query retries all encounter the same technical failure.
    readAccount = async () => new Response(null, { status: 503 });
    await act(() =>
      firstAccountRead.resolve(new Response(null, { status: 503 })),
    );

    // Then: the common member failure still leaves the tap available for an explicit release.
    expect(
      await screen.findByRole(
        "alert",
        { name: "Impossible de charger votre compte" },
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
    expect(Notifications.clearLastNotificationResponse).not.toHaveBeenCalled();
    expect(screen).toHavePathname("/");
    expect(
      mockFetch.mock.calls.some(([url]) =>
        /\/matches\/|\/notifications\//.test(url),
      ),
    ).toBe(false);
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();

    // When: a successful explicit reread or explicit local guest exit releases ordinary navigation.
    if (recovery === "retry") {
      readAccount = async () => Response.json(accountResponse({ accountId }));
    } else {
      mockAuth0.clearCredentials.mockImplementationOnce(async () => {
        mockAuth0.hasValidCredentials.mockResolvedValue(false);
      });
    }
    await user.press(
      screen.getByRole("button", {
        name:
          recovery === "retry" ? "Réessayer" : "Continuer en tant qu’invité",
      }),
    );

    // Then: everyone may open the public match, but only its current personal owner acknowledges it.
    expect(
      await screen.findByRole("header", { name: "Informations" }),
    ).toBeOnTheScreen();
    expect(screen).toHavePathname(`/matches/${row.match.id}`);
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(
      1,
    );
    expect(
      mockFetch.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(acknowledgements);
    expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(
      recovery === "guest" ? 1 : 0,
    );
    expect(destinationSession).toMatchObject({
      status: recovery === "guest" ? "guest" : "authenticated",
      subject: recovery === "guest" ? null : "synthetic-owner",
      accountId: recovery === "guest" ? null : accountId,
    });
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.some(([, init]) => init.method === "POST"),
    ).toBe(false);
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
    if (path.endsWith("notification-summary")) {
      return Response.json({ unreadCount: 0 });
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

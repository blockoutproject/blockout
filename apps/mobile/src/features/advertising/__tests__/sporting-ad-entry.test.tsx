import { signInAccount } from "../../pro/test-support/sign-in-account";
import {
  useState,
  useEffect,
  useLayoutEffect,
  type PropsWithChildren,
} from "react";
import { createInstallationAdvertisingPrivacy } from "../advertising-privacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../../shared/native/test-support/tab-view-native";
import * as Notifications from "expo-notifications";
import { AdEventType } from "react-native-google-mobile-ads";
import type {
  MatchDetailResponse,
  PoolStandingsResponse,
  PoolParticipantsResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  AccountSessionProvider,
  useAccountSession,
  type AccountSession,
} from "../../accounts/session/account-session-provider";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { accountResponse } from "../../accounts/test-support/account-response";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { AccessAdmissionProvider } from "../../access/queries/use-access-admission";
import { ProProvider } from "../../pro";
import * as proSessionModule from "../../pro/pro-session";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { createQueryClient } from "../../../shared/query/query-client";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { CalendarMatch } from "../../sporting/components/calendar-match";
import { MatchLinks } from "../../sporting/components/match-links";
import { PoolScreen } from "../../sporting/screens/pool-screen";
import { TeamScreen } from "../../sporting/screens/team-screen";
import { SportingLink } from "../../sporting/components/sporting-identity";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { AgeDeclarationProvider } from "../age-declaration-provider";
import { submitAgeDeclaration } from "../age-declaration";
import { controlledInterstitial } from "../test-support/interstitial";
import { NotificationsScreen } from "../../notifications/screens/notifications-screen";
import { NotificationLifecycle } from "../../notifications/native/notification-lifecycle";
import { createPushRegistration } from "../../notifications/native/push-registration";
import { notificationResponse } from "../../notifications/test-support/notification-data";

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
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("react-native-google-mobile-ads", () => ({
  ...jest.requireActual("../test-support/native-privacy").nativeAdvertising,
  AdEventType: {
    LOADED: "loaded",
    OPENED: "opened",
    CLOSED: "closed",
    ERROR: "error",
  },
  InterstitialAd: { createForAdRequest: jest.fn(() => mockCreateAd()) },
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        advertising: {
          iosInterstitialUnitId: "synthetic-unit",
          androidInterstitialUnitId: "synthetic-unit",
        },
        revenueCat: { iosApiKey: "test_public", androidApiKey: "test_public" },
      },
    },
  },
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useIsFocused: () => true,
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => mockNavigation,
  useRootNavigationState: () => ({ key: "root" }),
}));
jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "default",
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn(async () => true),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
const mockCreateAd = jest.fn(controlledInterstitial);
let mockFocused = true;
const mockNavigation = {
  isFocused: () => mockFocused,
  addListener: () => () => undefined,
};
const environment = { ...process.env };
let client = createQueryClient();
let session: AccountSession;
let ad = controlledInterstitial();
let push = createPushRegistration();
const inboxRow = notificationResponse();
const nativeNotificationId = "00000000-0000-4000-8000-000000000288";
const nativeMatchId = "00000000-0000-4000-8000-000000000289";
let failNativeRead = false;
let table: PoolStandingsResponse;
let participants: PoolParticipantsResponse;
beforeEach(async () => {
  // Inbox retention and native-ad freshness use a fixed current instant; native Query timers stay controlled.
  jest.useFakeTimers({ now: new Date("2026-10-28T12:00:00Z") });
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  jest.mocked(initializeV2Installation).mockResolvedValue();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "synthetic-mobile",
  });
  await AsyncStorage.clear();
  await submitAgeDeclaration(18, new Date());
  client = createQueryClient();
  push = createPushRegistration();
  mockFocused = true;
  failNativeRead = false;
  participants = { poolId: matchDetail().match.pool.pool.id, items: [] };
  table = {
    poolId: matchDetail().match.pool.pool.id,
    availability: "available",
    observedAt: "2026-10-28T12:00:00Z",
    lastAttemptFailed: false,
    columns: ["Points"],
    rows: [
      {
        sourceName: "Original standings team",
        team: {
          id: "00000000-0000-4000-8000-000000000301",
          name: "Original team",
        },
        statistics: { Points: "7" },
      },
    ],
  };
  jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mockClear();
  jest.mocked(Notifications.clearLastNotificationResponse).mockClear();
  mockPush.mockReset();
  mockFetch
    .mockReset()
    .mockImplementation(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/standings")) return Response.json(table);
      if (path.endsWith("/participants")) return Response.json(participants);
      if (path.startsWith("/pools/"))
        return Response.json({ pool: matchDetail().match.pool });
      if (path.startsWith("/teams/"))
        return Response.json({
          team: {
            team: matchDetail().match.home,
            season: matchDetail().match.pool.season,
            classification: {},
            professional: false,
          },
          participations: [matchDetail().match.pool],
        });
      if (path === "/matches")
        return Response.json({
          category: new URL(url).searchParams.get("category"),
          timeZone: new URL(url).searchParams.get("timeZone"),
          evaluatedAt: "2026-10-28T12:00:00Z",
          days: [],
        });
      if (path.endsWith("application-access"))
        return Response.json(applicationAccessResponse());
      if (path.endsWith("accounts/me"))
        return Response.json(accountResponse({ accountId: inboxRow.id }));
      if (path.endsWith("notification-summary"))
        return Response.json({ unreadCount: 0 });
      if (path.endsWith("/notifications"))
        return Response.json({ notifications: [inboxRow] });
      if (
        path.endsWith(`/notifications/${inboxRow.id}`) &&
        init?.method === "PATCH"
      )
        return Response.json({ ...inboxRow, read: true });
      if (path.endsWith(`/notifications/${nativeNotificationId}`))
        return failNativeRead && init?.method === "PATCH"
          ? Response.json({}, { status: 500 })
          : Response.json({
              ...inboxRow,
              id: nativeNotificationId,
              read: !failNativeRead,
              match: { ...inboxRow.match, id: nativeMatchId },
            });
      throw new Error("Unexpected synthetic transport");
    });
  ad = controlledInterstitial();
  mockCreateAd
    .mockReset()
    .mockImplementationOnce(() => ad)
    .mockImplementation(controlledInterstitial);
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
  jest.useRealTimers();
});
/** Actual sporting rows and F05/F09/F11/F12 owners; only native and HTTP I/O and router handoff are controlled. */
function Entries({
  detail = matchDetail(),
  notifications = false,
  calendarActive = true,
  resourcePage,
}: {
  detail?: MatchDetailResponse;
  notifications?: boolean;
  calendarActive?: boolean;
  resourcePage?: "pool" | "team";
}) {
  const current = useAccountSession();
  useLayoutEffect(() => {
    session = current;
  });
  return (
    <>
      <SportingLink
        kind="club"
        id="00000000-0000-4000-8000-000000000011"
        label="Club"
      />
      <SportingLink
        kind="team"
        id="00000000-0000-4000-8000-000000000012"
        label="Équipe"
      />
      <SportingLink
        kind="pool"
        id="00000000-0000-4000-8000-000000000013"
        label="Poule"
      />
      <CalendarMatch
        match={matchDetail().match}
        displayTimeZone="Europe/Paris"
        active={calendarActive}
      />
      <MatchLinks detail={detail} />
      {resourcePage === "pool" && (
        <PoolScreen poolId={matchDetail().match.pool.pool.id} />
      )}
      {resourcePage === "team" && (
        <TeamScreen teamId={matchDetail().match.home.id} />
      )}
      {notifications && (
        <>
          <NotificationLifecycle registration={push} enabled />
          <NotificationsScreen />
        </>
      )}
    </>
  );
}
/** Matches the production root ownership without mounting unrelated navigation screens. */
function Owners({ children }: PropsWithChildren) {
  const [privacy] = useState(createInstallationAdvertisingPrivacy);
  useEffect(() => () => privacy.dispose(), [privacy]);
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <QueryClientProvider client={client}>
          <ThemeProvider>
            <ActionFeedbackProvider scopeKey="test">
              <ApplicationAccessProvider>
                <AccountSessionProvider>
                  <AccessAdmissionProvider>
                    <ProProvider>
                      <AgeDeclarationProvider enabled privacy={privacy}>
                        {children}
                      </AgeDeclarationProvider>
                    </ProProvider>
                  </AccessAdmissionProvider>
                </AccountSessionProvider>
              </ApplicationAccessProvider>
            </ActionFeedbackProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
/** Waits only for real installation/native readiness before supplying the native LOADED event. */
async function mount(props: Parameters<typeof Entries>[0] = {}) {
  const result = await render(
    <Owners>
      <Entries {...props} />
    </Owners>,
  );
  await screen.findByRole("link", { name: "Club" });
  await waitFor(() => expect(mockCreateAd).toHaveBeenCalledTimes(1));
  await act(async () => ad.emit(AdEventType.LOADED));
  if (props.resourcePage) {
    await screen.findByRole("link", { name: /Original standings team/ });
  }
  return result;
}
it("shares nine real club/team/pool openings with the tenth calendar opening and deduplicates pending taps", async () => {
  // Given
  await mount();
  const user = userEvent.setup();
  for (let index = 0; index < 9; index++)
    await user.press(
      screen.getByRole("link", {
        name: ["Club", "Équipe", "Poule"][index % 3],
      }),
    );
  expect(mockPush).toHaveBeenCalledTimes(9);
  expect(ad.show).not.toHaveBeenCalled();
  const match = screen.getByRole("link", { name: /Ouvrir le match/ });
  // When
  await user.press(match);
  await user.press(match);
  await user.press(screen.getByRole("link", { name: "Club" }));
  // Then
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(9);
  await act(async () => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
  });
  expect(mockPush).toHaveBeenCalledTimes(10);
  expect(mockPush).toHaveBeenLastCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: matchDetail().match.id },
  });
});
it("abandons the pending calendar destination when the native principal changes", async () => {
  // Given
  await mount();
  const user = userEvent.setup();
  for (let index = 0; index < 9; index++)
    await user.press(screen.getByRole("link", { name: "Club" }));
  await user.press(screen.getByRole("link", { name: /Ouvrir le match/ }));
  expect(ad.show).toHaveBeenCalledTimes(1);
  // When
  await act(async () => {
    await signInAccount(session, "00000000-0000-4000-8000-000000000001");
  });
  await act(async () => {
    ad.emit(AdEventType.CLOSED);
  });
  // Then
  expect(mockPush).toHaveBeenCalledTimes(9);
  expect(mockPush).not.toHaveBeenCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: matchDetail().match.id },
  });
});
it.each(["screen focus", "calendar tab"])(
  "does not release a calendar destination after its still-mounted source loses %s",
  async (source) => {
    // Given
    const result = await mount();
    const user = userEvent.setup();
    for (let index = 0; index < 9; index++)
      await user.press(screen.getByRole("link", { name: "Club" }));
    await user.press(screen.getByRole("link", { name: /Ouvrir le match/ }));
    expect(ad.show).toHaveBeenCalledTimes(1);
    // When
    if (source === "screen focus") mockFocused = false;
    else
      await result.rerender(
        <Owners>
          <Entries calendarActive={false} />
        </Owners>,
      );
    await act(async () => {
      ad.emit(AdEventType.OPENED);
      ad.emit(AdEventType.CLOSED);
    });
    // Then
    expect(mockPush).toHaveBeenCalledTimes(9);
  },
);
it("shares calendar, inbox and native tap openings while keeping read failure independent of the pending ad", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  await mount({ notifications: true });
  const user = userEvent.setup();
  const match = screen.getByRole("link", { name: /Ouvrir le match/ });
  for (let index = 0; index < 8; index++) await user.press(match);
  const receive = jest
    .mocked(Notifications.addNotificationReceivedListener)
    .mock.calls.at(-1)?.[0];
  if (!receive) throw new Error("Expected native receive subscription");
  await act(async () =>
    receive({
      date: Date.now(),
      request: {
        identifier: "synthetic-passive-receipt",
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
          data: {},
        },
      },
    }),
  );
  await user.press(
    await screen.findByRole("link", { name: /Le résultat est disponible/ }),
  );
  expect(mockPush).toHaveBeenCalledTimes(9);
  const tap = jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mock.calls.at(-1)?.[0];
  if (!tap) throw new Error("Expected native tap subscription");
  const response: Notifications.NotificationResponse = {
    actionIdentifier: "default",
    notification: {
      date: Date.now(),
      request: {
        identifier: "synthetic-native-response",
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
            ownerAccountId: inboxRow.id,
            notificationId: nativeNotificationId,
            matchId: nativeMatchId,
          },
        },
      },
    },
  };
  failNativeRead = true;
  // When
  await act(async () => {
    tap(response);
    tap(response);
  });
  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith(`/notifications/${nativeNotificationId}`) &&
          init?.method === "PATCH",
      ),
    ).toHaveLength(1),
  );
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(9);
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
  await act(async () => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
  });
  expect(mockPush).toHaveBeenCalledTimes(10);
  expect(mockPush).toHaveBeenLastCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: nativeMatchId },
  });
});
it("releases the exact calendar destination once when the SDK rejects presentation", async () => {
  // Given
  await mount();
  const user = userEvent.setup();
  for (let index = 0; index < 9; index++)
    await user.press(screen.getByRole("link", { name: "Club" }));
  ad.show.mockRejectedValueOnce(new Error("Synthetic presentation failure"));
  // When
  await user.press(screen.getByRole("link", { name: /Ouvrir le match/ }));
  await act(async () => {
    ad.emit(AdEventType.CLOSED);
  });
  // Then
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(10);
  expect(mockPush).toHaveBeenLastCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: matchDetail().match.id },
  });
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});
it("abandons the exact old stream URL when its published version changes during an interstitial", async () => {
  // Given
  const original = {
    ...matchDetail(),
    streamUrl: "https://video.example.invalid/first",
    streamContributionId: "00000000-0000-4000-8000-000000000601",
  };
  const result = await mount({ detail: original });
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue();
  const user = userEvent.setup();
  for (let index = 0; index < 9; index++)
    await user.press(screen.getByRole("link", { name: "Club" }));
  await user.press(screen.getByRole("link", { name: "Ouvrir le lien" }));
  expect(ad.show).toHaveBeenCalledTimes(1);
  // When
  await result.rerender(
    <Owners>
      <Entries
        detail={{
          ...original,
          streamUrl: "https://video.example.invalid/replacement",
          streamContributionId: "00000000-0000-4000-8000-000000000602",
        }}
      />
    </Owners>,
  );
  await act(async () => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
  });
  // Then
  expect(openURL).not.toHaveBeenCalled();
  await user.press(screen.getByRole("link", { name: "Ouvrir le lien" }));
  expect(openURL).toHaveBeenCalledTimes(1);
  expect(openURL).toHaveBeenCalledWith(
    "https://video.example.invalid/replacement",
  );
});
it("abandons a still-mounted stream handoff after the match route loses focus", async () => {
  // Given
  await mount({
    detail: {
      ...matchDetail(),
      streamUrl: "https://video.example.invalid/current",
    },
  });
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue();
  const user = userEvent.setup();
  for (let index = 0; index < 9; index++)
    await user.press(screen.getByRole("link", { name: "Club" }));
  await user.press(screen.getByRole("link", { name: "Ouvrir le lien" }));
  expect(ad.show).toHaveBeenCalledTimes(1);
  // When
  mockFocused = false;
  await act(async () => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
  });
  // Then
  expect(openURL).not.toHaveBeenCalled();
});
it.each(["list", "cards", "podium"])(
  "abandons a pending %s standings team when refresh changes its association at the same slot",
  async (layout) => {
    // Given
    if (layout === "podium")
      table = {
        ...table,
        rows: [
          { ...table.rows[0], position: 1 },
          { sourceName: "Second", position: 2, statistics: { Points: "5" } },
          { sourceName: "Third", position: 3, statistics: { Points: "3" } },
        ],
      };
    await mount({ resourcePage: "pool" });
    const user = userEvent.setup();
    if (layout !== "list")
      await user.press(
        screen.getByRole("radio", { name: "Afficher en cartes" }),
      );
    for (let index = 0; index < 9; index++)
      await user.press(screen.getByRole("link", { name: "Club" }));
    await user.press(
      screen.getByRole("link", { name: /Original standings team/ }),
    );
    expect(ad.show).toHaveBeenCalledTimes(1);
    // When
    table = {
      ...table,
      rows: table.rows.map((row, index) =>
        index === 0
          ? {
              ...row,
              sourceName: "Replacement standings team",
              team: {
                id: "00000000-0000-4000-8000-000000000302",
                name: "Replacement team",
              },
            }
          : row,
      ),
    };
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await screen.findByRole("link", { name: /Replacement standings team/ });
    await act(async () => {
      ad.emit(AdEventType.OPENED);
      ad.emit(AdEventType.CLOSED);
    });
    // Then
    expect(mockPush).toHaveBeenCalledTimes(9);
    await user.press(
      screen.getByRole("link", { name: /Replacement standings team/ }),
    );
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: "/teams/[teamId]",
      params: { teamId: "00000000-0000-4000-8000-000000000302" },
    });
  },
);
it.each(["list", "cards"])(
  "abandons a pending %s standings opening when the actual pool tab changes",
  async (layout) => {
    // Given
    await mount({ resourcePage: "pool" });
    const user = userEvent.setup();
    if (layout === "cards")
      await user.press(
        screen.getByRole("radio", { name: "Afficher en cartes" }),
      );
    for (let index = 0; index < 9; index++)
      await user.press(screen.getByRole("link", { name: "Club" }));
    await user.press(
      screen.getByRole("link", { name: /Original standings team/ }),
    );
    expect(ad.show).toHaveBeenCalledTimes(1);
    // When
    await user.press(screen.getByRole("tab", { name: "À venir" }));
    await act(async () => {
      ad.emit(AdEventType.OPENED);
      ad.emit(AdEventType.CLOSED);
    });
    // Then
    expect(mockPush).toHaveBeenCalledTimes(9);
  },
);
it("abandons a participation pool link when the actual team page changes its tab", async () => {
  // Given
  await mount({ resourcePage: "team" });
  const user = userEvent.setup();
  for (let index = 0; index < 9; index++)
    await user.press(screen.getByRole("link", { name: "Club" }));
  await user.press(screen.getByRole("link", { name: "Pool" }));
  expect(ad.show).toHaveBeenCalledTimes(1);
  // When
  await user.press(screen.getByRole("tab", { name: "À venir" }));
  await act(async () => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
  });
  // Then
  expect(mockPush).toHaveBeenCalledTimes(9);
});
it("abandons a pending map team opening when a coincident team replaces the selection", async () => {
  // Given
  const pool = matchDetail().match.pool;
  const firstId = "00000000-0000-4000-8000-000000000301";
  const secondId = "00000000-0000-4000-8000-000000000302";
  participants = {
    poolId: pool.pool.id,
    items: [
      {
        team: {
          team: { id: firstId, name: "Rives" },
          season: pool.season,
          classification: {},
          professional: false,
          club: { id: firstId, name: "Club des Rives" },
        },
        location: { latitude: 46.16, longitude: -1.15, label: "La Rochelle" },
      },
      {
        team: {
          team: { id: secondId, name: "Marais" },
          season: pool.season,
          classification: {},
          professional: false,
          club: { id: secondId, name: "Club du Marais" },
        },
        location: { latitude: 46.16, longitude: -1.15, label: "La Rochelle" },
      },
    ],
  };
  await mount({ resourcePage: "pool" });
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Carte" }));
  // MarkerPress is a native event outside userEvent's Pressable interaction contract.
  await fireEvent(
    await screen.findByRole("button", { name: "La Rochelle: Rives, Marais" }),
    "press",
    { stopPropagation: jest.fn() },
  );
  for (let index = 0; index < 9; index++)
    await user.press(screen.getByRole("link", { name: "Club" }));
  await user.press(screen.getByRole("link", { name: "Rives" }));
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(mockPush).toHaveBeenCalledTimes(9);
  // When
  await user.press(screen.getByRole("radio", { name: "Marais" }));
  await act(async () => {
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
  });
  // Then
  expect(mockPush).toHaveBeenCalledTimes(9);
  expect(mockPush).not.toHaveBeenCalledWith({
    pathname: "/teams/[teamId]",
    params: { teamId: firstId },
  });
  await user.press(screen.getByRole("link", { name: "Marais" }));
  expect(mockPush).toHaveBeenLastCalledWith({
    pathname: "/teams/[teamId]",
    params: { teamId: secondId },
  });
});

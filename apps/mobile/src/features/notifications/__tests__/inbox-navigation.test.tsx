import { createInstallationAdvertisingPrivacy } from "../../advertising/advertising-privacy";
import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cleanup,
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Stack, router } from "expo-router";
import { Dimensions, Linking, Text } from "react-native";
import { useEffect, useState, useLayoutEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import TabsLayout from "../../../app/(ordinary)/(tabs)/_layout";
import NotificationsRoute from "../../../app/(ordinary)/(tabs)/notifications";
import SearchLayout from "../../../app/(ordinary)/(tabs)/search/_layout";
import SearchRoute from "../../../app/(ordinary)/(tabs)/search/index";
import SearchFiltersRoute from "../../../app/(ordinary)/(tabs)/search/(sheets)/filters";
import SearchChoiceRoute from "../../../app/(ordinary)/(tabs)/search/(sheets)/choice";
import MatchRoute from "../../../app/(ordinary)/matches/[matchId]";
import { NotificationState } from "../state/notification-state";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { notificationResponse } from "../test-support/notification-data";
import { createInboxQueries } from "../api/inbox-queries";
import { currentAccountQuery } from "../../accounts/api/current-account-query";
import type { MatchDetailResponse } from "../../../../.generated/schemas/index.zod";
import {
  AccessAdmissionProvider,
  useAccessAdmission,
} from "../../access/queries/use-access-admission";
import { ProProvider } from "../../pro";
import { AgeDeclarationProvider } from "../../advertising/age-declaration-provider";
import { submitAgeDeclaration } from "../../advertising/age-declaration";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import * as proSessionModule from "../../pro/pro-session";
import { ownContributions } from "../../contributions/test-support/contribution-data";
import * as Notifications from "expo-notifications";
import { NotificationLifecycle } from "../native/notification-lifecycle";
import { createPushRegistration } from "../native/push-registration";

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
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
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
const env = { ...process.env };
const row = notificationResponse();
let client = createQueryClient();
let privateClient: ReturnType<typeof createQueryClient>;
let total = 7;
const streamUrl =
  "https://www.youtube.com/watch?v=synthetic&edition=exact%2Fone";
let match: MatchDetailResponse;

/** Real inbox/match Router and session/privacy owners; native SDKs and HTTP remain controlled. */
function SessionRoutes({
  privacy,
}: {
  privacy: ReturnType<typeof createInstallationAdvertisingPrivacy>;
}) {
  const cache = useQueryClient();
  const [registration] = useState(createPushRegistration);
  useLayoutEffect(() => {
    privateClient = cache;
  }, [cache]);

  return (
    <AccountFeedbackProvider>
      <AccessAdmissionProvider>
        <ProProvider>
          <AgeDeclarationProvider enabled privacy={privacy}>
            <NotificationState>
              <NativeResponses registration={registration} />
              <Stack screenOptions={{ headerShown: false }} />
            </NotificationState>
          </AgeDeclarationProvider>
        </ProProvider>
      </AccessAdmissionProvider>
    </AccountFeedbackProvider>
  );
}

/** Uses the actual root admission rule before SDK response subscriptions can become ready. */
function NativeResponses({
  registration,
}: {
  registration: ReturnType<typeof createPushRegistration>;
}) {
  const access = useAccessAdmission();
  return (
    <NotificationLifecycle
      registration={registration}
      enabled={access.ordinary}
    />
  );
}

/** Owns one cache and the real gesture root; pager/list geometry remains a controlled native boundary. */
function Root() {
  const [privacy] = useState(createInstallationAdvertisingPrivacy);
  useEffect(() => () => privacy.dispose(), [privacy]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <SessionRoutes privacy={privacy} />
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
  client = createQueryClient();
  total = 7;
  let read = false;
  jest
    .mocked(Notifications.addNotificationResponseReceivedListener)
    .mockClear();
  jest.mocked(Notifications.clearLastNotificationResponse).mockClear();
  match = { match: { ...row.match }, documents: [], streamUrl };
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  await AsyncStorage.clear();
  await submitAgeDeclaration(30);
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "synthetic-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("synthetic-owner"));
  mockFetch
    .mockReset()
    .mockImplementation(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.endsWith("application-access"))
        return Response.json(applicationAccessResponse());
      if (path.endsWith("accounts/me"))
        return Response.json(accountResponse({ accountId: row.id }));
      if (path.endsWith("sporting-search-options"))
        return Response.json({
          resourceType: new URL(url).searchParams.get("resourceType"),
          seasons: [],
          divisions: [],
          formats: ["6x6"],
          genders: ["female", "male", "mixed"],
        });
      if (path.endsWith("notification-summary"))
        return Response.json(
          total
            ? { unreadCount: total, nextExpiryAt: "2026-11-01T00:00:00Z" }
            : { unreadCount: 0 },
        );
      if (path.endsWith("/notifications"))
        return Response.json({ notifications: [{ ...row, read }] });
      if (path.endsWith(`/matches/${row.match.id}`))
        return Response.json(match);
      if (path.endsWith("/stream-contributions"))
        return Response.json(ownContributions());
      if (
        path.endsWith(`/notifications/${row.id}`) &&
        init.method === "PATCH"
      ) {
        total = 6;
        read = true;
        return Response.json({ ...row, read: true });
      }
      throw new Error(`Unexpected synthetic boundary ${path}`);
    });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  privateClient?.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  process.env = { ...env };
  jest.restoreAllMocks();
});

/** Production tab/search/inbox/match entries retain their owners; Home and profile are controlled destinations. */
async function openInbox() {
  return renderRouter(
    {
      _layout: Root,
      "(tabs)/_layout": TabsLayout,
      "(tabs)/index": () => <Text>Accueil</Text>,
      "(tabs)/search/_layout": SearchLayout,
      "(tabs)/search/index": SearchRoute,
      "(tabs)/search/(sheets)/filters": SearchFiltersRoute,
      "(tabs)/search/(sheets)/choice": SearchChoiceRoute,
      "(tabs)/profile": () => <Text>Profil</Text>,
      "(tabs)/notifications": NotificationsRoute,
      "matches/[matchId]": MatchRoute,
    },
    { initialUrl: "/notifications" },
  );
}

it.each([false, true])(
  "retains server reading after a detail failure with lost acknowledgement=%s",
  async (lost) => {
    // Given: real Router, F03 screen, privacy/session owners and generated F07 commands.
    await openInbox();
    await screen.findByRole("link", { name: /non lue$/ });
    privateClient.setDefaultOptions({ queries: { retry: false } });
    const ordinary = mockFetch.getMockImplementation();
    if (!ordinary) throw new Error("Synthetic HTTP implementation is required");
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (new URL(url).pathname.endsWith(`/matches/${row.match.id}`))
        return new Response(null, { status: 503 });
      const response = await ordinary(url, init);
      if (lost && init.method === "PATCH")
        throw new TypeError("lost read acknowledgement");
      return response;
    });
    const user = userEvent.setup();

    // When
    await user.press(screen.getByRole("link", { name: /non lue$/ }));
    await screen.findByRole("button", { name: "Réessayer" });

    // Then
    expect(screen).toHavePathname(`/matches/${row.match.id}`);

    // When: the ordinary return/focus reads the server representation.
    await user.press(screen.getByRole("button", { name: "Retour" }));

    // Then
    expect(
      await screen.findByRole("link", { name: /— lue$/ }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByRole("button", { name: "Notifications, 6 non lues" }),
    ).toBeOnTheScreen();
    const commands = mockFetch.mock.calls.filter(
      ([, init]) => init.method === "PATCH",
    );
    expect(commands).toHaveLength(1);
    expect(JSON.parse(commands[0][1].body)).toEqual({ read: true });
    expect(
      mockFetch.mock.calls.some(
        ([url, init]) =>
          new URL(url).pathname.endsWith(`/notifications/${row.id}`) &&
          init.method === "GET",
      ),
    ).toBe(false);
  },
);

it.each(["owner", "foreign", "guest"] as const)(
  "opens an old missing notification's current F03 target as %s without recreating it",
  async (actor) => {
    // Given: only SDK event I/O is controlled; the actual lifecycle and navigator are mounted.
    if (actor === "guest")
      mockAuth0.hasValidCredentials.mockResolvedValue(false);
    const ordinary = mockFetch.getMockImplementation();
    if (!ordinary) throw new Error("Synthetic HTTP implementation is required");
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      if (path.endsWith(`/notifications/${row.id}`))
        return new Response(null, { status: 404 });
      if (path.endsWith("/notifications"))
        return Response.json({ notifications: [] });
      if (path.endsWith("/notification-summary"))
        return Response.json({ unreadCount: 0 });
      return ordinary(url, init);
    });
    await openInbox();
    if (actor === "guest") {
      await screen.findByRole("tab", { name: "Équipes" });
      await layoutNativeTabs();
      await waitFor(() => expect(screen).toHavePathname("/search"));
    }
    await waitFor(() =>
      expect(
        Notifications.addNotificationResponseReceivedListener,
      ).toHaveBeenCalled(),
    );
    const tap = jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mock.calls.at(-1)?.[0];
    if (!tap) throw new Error("The native tap listener must be mounted");
    const notification: Notifications.NotificationResponse = {
      actionIdentifier: "default",
      notification: {
        date: Date.now(),
        request: {
          identifier: "old-missing-entry",
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
              ownerAccountId:
                actor === "owner"
                  ? row.id
                  : "00000000-0000-4000-8000-000000000991",
              notificationId: row.id,
              matchId: row.match.id,
            },
          },
        },
      },
    };
    const before = mockFetch.mock.calls.length;

    // When
    await act(async () => {
      tap(notification);
      tap(notification);
    });
    await screen.findByRole("header", { name: "Informations" });

    // Then
    expect(screen).toHavePathname(`/matches/${row.match.id}`);
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(
      1,
    );
    const personal = mockFetch.mock.calls
      .slice(before)
      .filter(([url]) => /\/notifications\/[^/]+$/.test(new URL(url).pathname));
    expect(personal).toHaveLength(actor === "owner" ? 1 : 0);
    if (actor === "owner") expect(personal[0][1].method).toBe("PATCH");
    expect(
      mockFetch.mock.calls.some(([, init]) => init.method === "POST"),
    ).toBe(false);
    if (actor === "owner") {
      // When
      await userEvent
        .setup()
        .press(screen.getByRole("button", { name: "Retour" }));

      // Then
      expect(
        await screen.findByText("Aucune notification pour le moment"),
      ).toBeOnTheScreen();
      expect(
        await screen.findByRole("button", { name: "Notifications" }),
      ).toBeOnTheScreen();
    }
  },
);

it.each(["professional", "contributed"] as const)(
  "opens the current match's exact %s stream destination from the real inbox",
  async (source) => {
    // Given
    if (source === "contributed")
      match.streamContributionId = "00000000-0000-4000-8000-000000000290";
    await openInbox();
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const user = userEvent.setup();
    await screen.findByRole("link", { name: /non lue$/ });
    expect(
      await screen.findByRole("button", { name: "Notifications, 7 non lues" }),
    ).toBeOnTheScreen();

    // When
    await user.press(screen.getByRole("link", { name: /non lue$/ }));
    await user.press(
      await screen.findByRole("link", { name: "Ouvrir le lien" }),
    );

    // Then
    expect(screen).toHavePathname(`/matches/${row.match.id}`);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(streamUrl);
  },
);

it("offers no fictional stream opening when the current match has no link", async () => {
  // Given
  delete match.streamUrl;
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await openInbox();
  const user = userEvent.setup();

  // When
  await user.press(await screen.findByRole("link", { name: /non lue$/ }));
  await screen.findByRole("header", { name: "Informations" });

  // Then: the distinct contribution action does not become a fictional viewing destination.
  expect(screen.queryByRole("link", { name: "Ouvrir le lien" })).toBeNull();
  expect(
    await screen.findByRole("button", { name: "Proposer un lien" }),
  ).toBeOnTheScreen();
  expect(open).not.toHaveBeenCalled();
});

it("shows known link absence on the retained result when returning to an offline inbox", async () => {
  // Given: a real enriched result remains in the inbox while its current F03 link has gone.
  const linked = {
    ...row,
    family: "result-with-link" as const,
    title: "Un lien a été proposé pour ce match.",
  };
  delete match.streamUrl;
  const ordinary = mockFetch.getMockImplementation();
  if (!ordinary) throw new Error("Synthetic HTTP implementation is required");
  let offline = false;
  mockFetch.mockImplementation((url: string, init: RequestInit) => {
    if (url.endsWith("/notifications"))
      return offline
        ? Promise.reject(new TypeError("offline inbox refresh"))
        : Promise.resolve(Response.json({ notifications: [linked] }));
    return ordinary(url, init);
  });
  await openInbox();
  const user = userEvent.setup();
  await screen.findByRole("link", { name: /^Un lien a été proposé/ });
  offline = true;

  // When
  await user.press(
    screen.getByRole("link", { name: /^Un lien a été proposé/ }),
  );
  await screen.findByRole("header", { name: "Informations" });
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then: the accepted result/read/age slots survive, without presenting the old link claim.
  expect(
    await screen.findByRole("link", { name: /^Le lien n’est plus proposé./ }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: /^Un lien a été proposé/ }),
  ).toBeNull();
  expect(screen).toHavePathname("/notifications");
});

it("removes a currently unavailable match from the real inbox despite a delayed page and offline retry", async () => {
  // Given: actual Router, F03 queries, notification state and F05 private client; HTTP is controlled.
  await openInbox();
  const user = userEvent.setup();
  await screen.findByRole("link", { name: /non lue$/ });
  privateClient.setDefaultOptions({ queries: { retry: false } });
  const queries = createInboxQueries(
    { subject: "synthetic-owner", accountId: row.id },
    async () => ({}),
  );
  const delayed = Promise.withResolvers<Response>();
  const ordinary = mockFetch.getMockImplementation();
  if (!ordinary) throw new Error("Synthetic HTTP implementation is required");
  mockFetch.mockImplementation((url: string, init: RequestInit) => {
    if (url.endsWith("/notifications")) return delayed.promise;
    if (url.endsWith(`/matches/${row.match.id}`))
      return Promise.resolve(new Response(null, { status: 404 }));
    if (url.endsWith("notification-summary"))
      return Promise.reject(new TypeError("offline summary"));
    return ordinary(url, init);
  });
  const oldPage = privateClient
    .fetchInfiniteQuery(queries.inbox)
    .catch(() => undefined);

  // When
  await user.press(screen.getByRole("link", { name: /non lue$/ }));
  await screen.findByRole("alert");
  await act(async () => {
    delayed.resolve(Response.json({ notifications: [row] }));
    await oldPage;
  });

  // Then
  expect(screen).toHavePathname(`/matches/${row.match.id}`);
  expect(screen.queryByRole("link", { name: "Ouvrir le lien" })).toBeNull();
  expect(
    privateClient.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
  expect(privateClient.getQueryData(queries.summary.queryKey)).toBeUndefined();

  // When
  mockFetch.mockRejectedValue(new TypeError("offline"));
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
  expect(
    privateClient.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
});

it("keeps current-match restriction handling mounted while this subject's private reads are suspended", async () => {
  // Given: a current-account refusal suspends F07 queries without replacing the F05 private client.
  await openInbox();
  await screen.findByRole("link", { name: /non lue$/ });
  privateClient.setDefaultOptions({ queries: { retry: false } });
  const queries = createInboxQueries(
    { subject: "synthetic-owner", accountId: row.id },
    async () => ({}),
  );
  const account = currentAccountQuery({
    status: "authenticated",
    getCredentials: async () => credentialsFor("synthetic-owner"),
  });
  const ordinary = mockFetch.getMockImplementation();
  if (!ordinary) throw new Error("Synthetic HTTP implementation is required");
  let suspended = true;
  mockFetch.mockImplementation((url: string, init: RequestInit) => {
    if (url.endsWith("accounts/me"))
      return suspended
        ? Promise.resolve(new Response(null, { status: 403 }))
        : ordinary(url, init);
    if (url.endsWith(`/matches/${row.match.id}`))
      return Promise.resolve(new Response(null, { status: 404 }));
    if (url.endsWith("/notifications") || url.endsWith("notification-summary"))
      return Promise.reject(new TypeError("offline private refresh"));
    return ordinary(url, init);
  });
  await act(async () => {
    await privateClient
      .fetchQuery({ ...account, retry: false })
      .catch(() => undefined);
  });
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull(),
  );

  // When: public F03 consultation remains possible during this suspension.
  await act(async () => router.push(`/matches/${row.match.id}`));
  await screen.findByRole("alert");

  // Then
  expect(
    privateClient.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
  expect(privateClient.getQueryData(queries.summary.queryKey)).toBeUndefined();

  // When: the same account returns, while the ordinary inbox refresh is offline.
  suspended = false;
  await act(async () => {
    await privateClient.fetchQuery({ ...account, retry: false });
    router.back();
  });

  // Then
  await waitFor(() => expect(screen).toHavePathname("/notifications"));
  expect(
    privateClient.getQueryData(queries.inbox.queryKey)?.pages[0].notifications,
  ).toEqual([]);
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
});

it("keeps the match available after a failed stream handoff and retries only on another press", async () => {
  // Given
  const open = jest
    .spyOn(Linking, "openURL")
    .mockRejectedValueOnce(new Error("No native handler"))
    .mockResolvedValue(undefined);
  await openInbox();
  const user = userEvent.setup();
  await user.press(await screen.findByRole("link", { name: /non lue$/ }));

  // When
  await user.press(await screen.findByRole("link", { name: "Ouvrir le lien" }));

  // Then
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Informations" }),
  ).toBeOnTheScreen();
  expect(open).toHaveBeenCalledTimes(1);
  await user.press(screen.getByRole("link", { name: "Ouvrir le lien" }));
  await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
  expect(open).toHaveBeenLastCalledWith(streamUrl);
  expect(screen.queryByRole("alert")).toBeNull();
});

it.each(["before", "after-without-result", "definitive-result"] as const)(
  "retains the neutral stream label for a match %s",
  async (state) => {
    // Given
    if (state !== "definitive-result") {
      delete match.match.result;
      match.match.category = state === "before" ? "upcoming" : "completed";
      match.match.schedule = {
        localDate: state === "before" ? "2026-10-28" : "2026-10-26",
        timeZone: "Europe/Paris",
        instant:
          state === "before" ? "2026-10-28T17:00:00Z" : "2026-10-26T17:00:00Z",
        observedAt: "2026-10-25T12:00:00Z",
      };
    }
    await openInbox();
    const user = userEvent.setup();

    // When
    await user.press(await screen.findByRole("link", { name: /non lue$/ }));

    // Then
    expect(
      await screen.findByRole("header", { name: "Stream link" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "Ouvrir le lien" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: /live|replay/i })).toBeNull();
  },
);

it("refreshes the real inbox summary after returning from the match destination", async () => {
  // Given
  await openInbox();
  const user = userEvent.setup();
  await user.press(await screen.findByRole("link", { name: /non lue$/ }));
  await screen.findByRole("header", { name: "Stream link" });
  total = 0;

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Notifications" }),
  ).toBeOnTheScreen();
  expect(screen).toHavePathname("/notifications");
  expect(
    screen.queryByRole("button", { name: /Notifications, .* non lues/ }),
  ).toBeNull();
});

it("routes a guest to public search without requesting a personal inbox or showing its tab", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);

  // When
  await openInbox();
  await screen.findByRole("tab", { name: "Équipes" });
  await layoutNativeTabs();

  // Then
  await waitFor(() => expect(screen).toHavePathname("/search"));
  expect(
    await screen.findByRole("button", { name: "Filtres" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: /Notifications/ })).toBeNull();
  expect(mockFetch.mock.calls.some(([url]) => /notification/.test(url))).toBe(
    false,
  );
});

it("retains the public search visit through its native sheets and a bottom-tab return", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  await openInbox();
  await screen.findByRole("tab", { name: "Équipes" });
  await layoutNativeTabs();
  const user = userEvent.setup();
  await user.press(await screen.findByRole("button", { name: "Filtres" }));
  await user.press(await screen.findByRole("button", { name: "Genre" }));
  await user.press(await screen.findByRole("radio", { name: "Masculin" }));
  await user.press(
    screen.getByRole("button", { name: "Appliquer les filtres" }),
  );
  await waitFor(() => expect(screen).toHavePathname("/search"));

  await layoutNativeTabs();

  // When
  await user.press(screen.getByRole("button", { name: "Profil" }));
  await waitFor(() => expect(screen).toHavePathname("/profile"));
  await user.press(screen.getByRole("button", { name: "Rechercher" }));
  await waitFor(() => expect(screen).toHavePathname("/search"));
  await layoutNativeTabs();
  await user.press(
    await screen.findByRole("button", { name: "Filtres actifs" }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Genre" }),
  ).toHaveAccessibilityValue({ text: "Masculin" });
  expect(mockFetch.mock.calls.some(([url]) => /notification/.test(url))).toBe(
    false,
  );
});

it("removes the zero-count tab badge after a confirmed summary refresh", async () => {
  // Given
  await openInbox();
  await screen.findByRole("button", { name: "Notifications, 7 non lues" });
  total = 0;

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("button", { name: "Notifications" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("7")).toBeNull();
});

it("retains native in-flight pagination on tab return and allows explicit refresh afterward", async () => {
  // Given
  const delayed = Promise.withResolvers<Response>();
  const newest = {
    ...row,
    id: "00000000-0000-4000-8000-000000000239",
    title: "Nouvelle information sportive",
  };
  let firstPage = true;
  const ordinary = mockFetch.getMockImplementation();
  if (!ordinary) throw new Error("Synthetic HTTP implementation is required");
  mockFetch.mockImplementation((url: string, init: RequestInit) => {
    const target = new URL(url);
    if (!target.pathname.endsWith("/notifications")) return ordinary(url, init);
    if (target.searchParams.has("cursor")) return delayed.promise;
    if (firstPage) {
      firstPage = false;
      return Promise.resolve(
        Response.json({ notifications: [row], nextCursor: "boundary" }),
      );
    }
    return Promise.resolve(Response.json({ notifications: [newest] }));
  });
  await openInbox();
  const user = userEvent.setup();
  await fireEvent(
    await screen.findByRole("link", { name: /^Le résultat/ }),
    "endReached",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Profil" }));
  await waitFor(() => expect(screen).toHavePathname("/profile"));
  await user.press(
    screen.getByRole("button", { name: "Notifications, 7 non lues" }),
  );

  // Then: returning to an existing observer does not replace its in-flight native page.
  expect(
    await screen.findByRole("link", { name: /^Le résultat/ }),
  ).toBeOnTheScreen();
  await act(async () => delayed.resolve(Response.json({ notifications: [] })));

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("link", { name: /^Nouvelle information/ }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /^Le résultat/ })).toBeNull();
});

it("distinguishes append retry from failed refresh in the real inbox route", async () => {
  // Given
  const second = {
    ...row,
    id: "00000000-0000-4000-8000-000000000239",
    title: "Une autre information sportive",
  };
  let failAppend = true;
  let failRefresh = false;
  const ordinary = mockFetch.getMockImplementation();
  if (!ordinary) throw new Error("Synthetic HTTP implementation is required");
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    const target = new URL(url);
    if (!target.pathname.endsWith("/notifications")) return ordinary(url, init);
    if (target.searchParams.has("cursor")) {
      if (failAppend) throw new TypeError("append unavailable");
      return Response.json({ notifications: [second] });
    }
    if (failRefresh) throw new TypeError("refresh unavailable");
    return Response.json({ notifications: [row], nextCursor: "same-boundary" });
  });
  await openInbox();
  privateClient.setDefaultOptions({ queries: { retry: false } });
  const first = await screen.findByRole("link", { name: /^Le résultat/ });
  const user = userEvent.setup();

  // When
  await fireEvent(first, "endReached");

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: /^Le résultat/ })).toBeOnTheScreen();
  await fireEvent(first, "endReached");
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(url).searchParams.has("cursor"),
    ),
  ).toHaveLength(1);

  // When
  failAppend = false;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByRole("link", { name: /^Une autre information/ });
  failRefresh = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", { name: /Une erreur est survenue/ }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: /^Le résultat/ })).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: /^Une autre information/ }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(url).searchParams.has("cursor"))
      .map(([url]) => new URL(url).searchParams.get("cursor")),
  ).toEqual(["same-boundary", "same-boundary"]);
});

it("retains every native tab action and its full accessible name with enlarged text in a narrow window", async () => {
  // Given: native window metrics are controlled; Router selection and trigger events remain real.
  const window = Dimensions.get("window");
  jest
    .spyOn(Dimensions, "get")
    .mockReturnValue({ ...window, width: 320, fontScale: 2 });
  await openInbox();
  const user = userEvent.setup();
  await screen.findByRole("link", { name: /non lue$/ });

  // When
  await user.press(screen.getByRole("button", { name: "Profil" }));
  await waitFor(() => expect(screen).toHavePathname("/profile"));
  await user.press(screen.getByRole("button", { name: "Rechercher" }));
  await waitFor(() => expect(screen).toHavePathname("/search"));
  await layoutNativeTabs();
  await user.press(
    screen.getByRole("button", { name: "Notifications, 7 non lues" }),
  );

  // Then
  expect(
    await screen.findByRole("button", {
      name: "Notifications, 7 non lues",
      selected: true,
    }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Accueil" })).toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, init]) => init.method === "PATCH")).toBe(
    false,
  );
});

import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Stack } from "expo-router";
import { Dimensions, Text } from "react-native";
import { useLayoutEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import TabsLayout from "../../../app/(ordinary)/(tabs)/_layout";
import NotificationsRoute from "../../../app/(ordinary)/(tabs)/notifications";
import SearchLayout from "../../../app/(ordinary)/(tabs)/search/_layout";
import SearchRoute from "../../../app/(ordinary)/(tabs)/search/index";
import SearchFiltersRoute from "../../../app/(ordinary)/(tabs)/search/filters";
import SearchChoiceRoute from "../../../app/(ordinary)/(tabs)/search/choice";
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
const mockFetch = jest.fn();
const env = { ...process.env };
const row = notificationResponse();
let client = createQueryClient();
let total = 7;

/** Real native router and all business providers; secondary destinations are controlled route fixtures. */
function SessionRoutes() {
  const session = useAccountSession();
  useLayoutEffect(
    () => bindSessionQueries(client, session.subscribe, session.isCurrent),
    [session.subscribe, session.isCurrent],
  );
  return (
    <AccountFeedbackProvider>
      <NotificationState>
        <Stack screenOptions={{ headerShown: false }} />
      </NotificationState>
    </AccountFeedbackProvider>
  );
}

/** Owns one cache and the real gesture root; pager/list geometry remains a controlled native boundary. */
function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <SessionRoutes />
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00Z") });
  client = createQueryClient();
  total = 7;
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
        return Response.json({ notifications: [row] });
      if (
        path.endsWith(`/notifications/${row.id}`) &&
        init.method === "PATCH"
      ) {
        total = 6;
        return Response.json({ ...row, read: true });
      }
      throw new Error(`Unexpected synthetic boundary ${path}`);
    });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  process.env = { ...env };
  jest.restoreAllMocks();
});

/** Production tab/search/inbox entries retain their owners; Home, profile and match destinations are controlled. */
async function openInbox() {
  return renderRouter(
    {
      _layout: Root,
      "(tabs)/_layout": TabsLayout,
      "(tabs)/index": () => <Text>Accueil</Text>,
      "(tabs)/search/_layout": SearchLayout,
      "(tabs)/search/index": SearchRoute,
      "(tabs)/search/filters": SearchFiltersRoute,
      "(tabs)/search/choice": SearchChoiceRoute,
      "(tabs)/profile": () => <Text>Profil</Text>,
      "(tabs)/notifications": NotificationsRoute,
      "matches/[matchId]": () => <Text>Destination du match</Text>,
    },
    { initialUrl: "/notifications" },
  );
}

it("projects seven unread into the real tab, opens the exact match, and refreshes when returning", async () => {
  // Given
  await openInbox();
  const user = userEvent.setup();
  await screen.findByRole("link", { name: /non lue$/ });
  expect(
    await screen.findByRole("button", { name: "Notifications, 7 non lues" }),
  ).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("link", { name: /non lue$/ }));

  // Then
  expect(await screen.findByText("Destination du match")).toBeOnTheScreen();
  expect(screen).toHavePathname(`/matches/${row.match.id}`);
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

it("restarts from newest on tab return while a continuation is still in flight", async () => {
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

  // Then
  expect(
    await screen.findByRole("link", { name: /^Nouvelle information/ }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: /^Le résultat/ })).toBeNull();
  await act(async () =>
    delayed.resolve(Response.json({ notifications: [row] })),
  );
  expect(
    screen.getByRole("link", { name: /^Nouvelle information/ }),
  ).toBeOnTheScreen();
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

import "../../../shared/native/test-support/tab-view-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { setBadgeCountAsync } from "expo-notifications";
import type { PropsWithChildren } from "react";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { ProfileScreen } from "../../accounts/screens/profile-screen";
import { SignInScreen } from "../../accounts/screens/sign-in-screen";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import {
  readAgeDeclaration,
  submitAgeDeclaration,
} from "../../advertising/age-declaration";
import { FollowButton } from "../../following/components/follow-button";
import { PersonalSeasonProvider } from "../../following/components/personal-season-provider";
import { PersonalScreen } from "../../following/screens/personal-screen";
import { followingFixture } from "../../following/test-support/following-fixture";
import { NotificationsScreen } from "../../notifications/screens/notifications-screen";
import { NotificationState } from "../../notifications/state/notification-state";
import { notificationResponse } from "../../notifications/test-support/notification-data";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
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
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useNavigation: () => mockNavigation,
  useIsFocused: () => true,
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: string, options?: RequestInit) => mockFetch(url, options),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockNavigation = {
  isFocused: () => true,
  addListener: jest.fn(() => () => undefined),
};
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const environment = { ...process.env };
const a = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000335",
  username: "FreshA",
  principalCreatedAt: "2020-01-02T12:00:00Z",
});
const b = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000336",
  username: "FreshB",
  // Shared provider email is not a client identity or permission association.
  email: a.email,
});
const season = {
  id: "00000000-0000-4000-8000-000000000337",
  label: "2026/2027",
  startYear: 2026,
};
const target = {
  type: "team",
  id: "00000000-0000-4000-8000-000000000338",
} as const;
let fixture = followingFixture();
let currentProfile = a;
let established = false;
const followedAccounts = new Set<string>();
let inbox = [] as ReturnType<typeof notificationResponse>[];

/** Real F05/F06/F07 consumers retain their private client; navigation and native/HTTP I/O are controlled. */
function Consumers({ children }: PropsWithChildren) {
  return (
    <AdvertisingProviders>
      <NotificationState>
        <PersonalSeasonProvider>{children}</PersonalSeasonProvider>
      </NotificationState>
    </AdvertisingProviders>
  );
}

/** Fictional fresh-target responses pass through the generated clients and response schemas. */
async function transport(url: string, options?: RequestInit) {
  const path = new URL(url).pathname;
  const ownerId = path.split("/")[2];
  const following = followedAccounts.has(ownerId);
  if (path === "/application-access")
    return Response.json(applicationAccessResponse());
  if (path === "/accounts" && options?.method === "POST") {
    established = true;
    return Response.json(currentProfile, { status: 201 });
  }
  if (path === "/accounts/me")
    return established
      ? Response.json(currentProfile)
      : Response.json({ title: "Not found", status: 404 }, { status: 404 });
  if (path.endsWith("/follow-options"))
    return Response.json({ seasons: [season], defaultSeasonId: season.id });
  if (path.endsWith("/team-follows"))
    return Response.json({
      items: following
        ? [
            {
              team: { id: target.id, name: "Équipe homonyme" },
              season,
              professional: false,
              classification: {},
            },
          ]
        : [],
    });
  if (path.endsWith("/pool-follows")) return Response.json({ items: [] });
  if (path.endsWith("/matches"))
    return Response.json({
      hasAvailableFollows: following,
      calendar: {
        category: new URL(url).searchParams.get("category"),
        timeZone: new URL(url).searchParams.get("timeZone"),
        evaluatedAt: new Date().toISOString(),
        days: [],
      },
    });
  if (path.endsWith(`/team-follows/${target.id}`)) {
    if (options?.method === "PUT") {
      if (JSON.parse(String(options.body)).following)
        followedAccounts.add(ownerId);
      else followedAccounts.delete(ownerId);
    }
    return Response.json({ following: followedAccounts.has(ownerId) });
  }
  if (path.endsWith("/notification-summary"))
    return Response.json(
      inbox.length
        ? {
            unreadCount: 7,
            nextExpiryAt: new Date(Date.now() + 86_400_000).toISOString(),
          }
        : { unreadCount: 0 },
    );
  if (path.endsWith("/notifications"))
    return Response.json({ notifications: inbox });
  throw new Error(`Unexpected controlled request ${path}`);
}

beforeEach(async () => {
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
  });
  await AsyncStorage.clear();
  fixture = followingFixture();
  currentProfile = a;
  established = false;
  followedAccounts.clear();
  inbox = [];
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
  mockAuth0.webAuth.mockReset().mockResolvedValue(credentialsFor("auth0|a"));
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(transport);
  mockPush.mockReset();
  mockReplace.mockReset();
});

afterEach(async () => {
  await cleanup();
  fixture.dispose();
  jest.restoreAllMocks();
  process.env = { ...environment };
});

it("establishes a fresh profile and honest empty follows/inbox without choosing follows on sign-in", async () => {
  // Given: actual initialization and explicit login; this is no business reset or external support erasure.
  const user = userEvent.setup();
  const view = await fixture.render(
    <Consumers>
      <SignInScreen admitted />
    </Consumers>,
  );
  await screen.findByRole("button", { name: "Se connecter", disabled: false });

  // When
  await user.press(screen.getByRole("button", { name: "Se connecter" }));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/profile"));
  await view.rerender(
    <Consumers>
      <ProfileScreen admitted proEntry={null} privacyEntry={null} />
    </Consumers>,
  );

  // Then
  expect(await screen.findByText(a.username)).toBeOnTheScreen();
  expect(screen.getByText(a.email)).toBeOnTheScreen();
  expect(screen.queryByRole("link", { name: "Maintenance" })).toBeNull();
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);

  // When
  await view.rerender(
    <Consumers>
      <PersonalScreen />
    </Consumers>,
  );
  await screen.findByRole("tab", { name: "Suivis" });
  await user.press(screen.getByRole("tab", { name: "Suivis" }));

  // Then
  expect(await screen.findByText("Aucun suivi à afficher")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Rechercher une équipe ou une poule" }),
  ).toBeEnabled();

  // When
  await view.rerender(
    <Consumers>
      <NotificationsScreen />
    </Consumers>,
  );

  // Then
  expect(
    await screen.findByText("Aucune notification pour le moment"),
  ).toBeOnTheScreen();
  expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
  expect(
    mockFetch.mock.calls.some(([, options]) =>
      ["PUT", "PATCH", "DELETE"].includes(options?.method ?? ""),
    ),
  ).toBe(false);

  // When: renewal remains an explicit action on the exact current target, even for a familiar name.
  await view.rerender(
    <Consumers>
      <FollowButton target={target} season={season} />
    </Consumers>,
  );
  await user.press(
    await screen.findByRole("button", { name: "Suivre", disabled: false }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Suivi", selected: true }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([, options]) => options?.method === "PUT")
      .map(([url, options]) => [
        new URL(url).pathname,
        JSON.parse(String(options?.body)),
      ]),
  ).toEqual([
    [`/accounts/${a.accountId}/team-follows/${target.id}`, { following: true }],
  ]);
});

it("keeps A’s issued follow callback and private data outside guest, B and a later A lifetime", async () => {
  // Given: a pending real F06 mutation belongs to A’s original client, not the next person sharing its email.
  await AsyncStorage.setItem("blockout:v2-initialized", "true");
  await submitAgeDeclaration(17);
  const declaration = await readAgeDeclaration();
  established = true;
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT" ? pending.promise : transport(url, options),
  );
  const user = userEvent.setup();
  const view = await fixture.render(
    <Consumers>
      <FollowButton target={target} season={season} />
    </Consumers>,
  );
  await user.press(
    await screen.findByRole("button", { name: "Suivre", disabled: false }),
  );
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
    ).toBe(true),
  );
  const originalClient = fixture.client;
  const originalCredentials = fixture.session.getCredentials;

  // When
  await act(async () => {
    await fixture.session.clearCredentials();
  });
  await waitFor(() => expect(fixture.session.status).toBe("guest"));
  const guestClient = fixture.client;
  const guestRequests = mockFetch.mock.calls.length;
  await view.rerender(
    <Consumers>
      <PersonalScreen />
    </Consumers>,
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Se connecter" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("tab", { name: "Suivis" })).toBeNull();
  expect(
    mockFetch.mock.calls
      .slice(guestRequests)
      .some(([url]) => new URL(url).pathname.startsWith("/accounts/")),
  ).toBe(false);
  expect(guestClient).not.toBe(originalClient);

  // When
  currentProfile = b;
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|b"));
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|b"));
  await act(async () => {
    await fixture.session.signIn("mobile-test");
  });
  await waitFor(() => expect(fixture.session.accountId).toBe(b.accountId));
  const bClient = fixture.client;
  await view.rerender(
    <Consumers>
      <FollowButton target={target} season={season} />
    </Consumers>,
  );
  await screen.findByRole("button", { name: "Suivre", disabled: false });
  await act(async () => {
    followedAccounts.add(a.accountId);
    pending.resolve(Response.json({ following: true }));
  });

  // Then
  expect(
    screen.getByRole("button", { name: "Suivre", selected: false }),
  ).toBeOnTheScreen();
  expect(bClient).not.toBe(guestClient);
  await expect(originalCredentials()).rejects.toMatchObject({
    kind: "cancelled",
  });
  expect(await readAgeDeclaration()).toEqual(declaration);

  // When: a later A sign-in obtains current readers, without adopting the detached A client.
  await act(async () => {
    await fixture.session.clearCredentials();
  });
  currentProfile = a;
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|a"));
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|a"));
  await act(async () => {
    await fixture.session.signIn("mobile-test");
  });
  await waitFor(() => expect(fixture.session.accountId).toBe(a.accountId));

  // Then
  expect(
    await screen.findByRole("button", {
      name: "Suivi",
      disabled: false,
      selected: true,
    }),
  ).toBeOnTheScreen();
  expect(fixture.client).not.toBe(originalClient);
  expect(fixture.client).not.toBe(bClient);
  expect(await readAgeDeclaration()).toEqual(declaration);
  originalClient.clear();
});

it("withdraws A’s inbox and whole count before a late read-command failure reaches B", async () => {
  // Given: the real inbox, generated PATCH and badge consume A’s current readers.
  await AsyncStorage.setItem("blockout:v2-initialized", "true");
  established = true;
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  inbox = [{ ...notificationResponse(), createdAt: new Date().toISOString() }];
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH" ? pending.promise : transport(url, options),
  );
  const user = userEvent.setup();
  await fixture.render(
    <Consumers>
      <NotificationsScreen />
    </Consumers>,
  );
  await user.press(await screen.findByRole("link", { name: /non lue$/ }));
  await waitFor(() => expect(setBadgeCountAsync).toHaveBeenLastCalledWith(7));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
    ).toBe(true),
  );
  const originalClient = fixture.client;

  // When
  await act(async () => {
    await fixture.session.clearCredentials();
  });
  await waitFor(() => expect(fixture.session.status).toBe("guest"));

  // Then
  expect(screen.queryByRole("link", { name: /non lue$/ })).toBeNull();
  expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);

  // When
  currentProfile = b;
  inbox = [];
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|b"));
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|b"));
  await act(async () => {
    await fixture.session.signIn("mobile-test");
  });
  await screen.findByText("Aucune notification pour le moment");
  const bRequests = mockFetch.mock.calls.length;
  await act(async () =>
    pending.resolve(
      Response.json({ title: "Not found", status: 404 }, { status: 404 }),
    ),
  );

  // Then: the old command neither restores an A card/counter nor invalidates B’s readers.
  expect(
    screen.getByText("Aucune notification pour le moment"),
  ).toBeOnTheScreen();
  expect(setBadgeCountAsync).toHaveBeenLastCalledWith(0);
  expect(fixture.client).not.toBe(originalClient);
  expect(
    mockFetch.mock.calls
      .slice(bRequests)
      .some(([url]) =>
        new URL(url).pathname.startsWith(`/accounts/${b.accountId}/`),
      ),
  ).toBe(false);
  expect(
    mockFetch.mock.calls
      .filter(([, options]) => options?.method === "PATCH")
      .map(([url, options]) => [
        new URL(url).pathname,
        JSON.parse(String(options?.body)),
      ]),
  ).toEqual([
    [
      `/accounts/${a.accountId}/notifications/${notificationResponse().id}`,
      { read: true },
    ],
  ]);
  originalClient.clear();
});

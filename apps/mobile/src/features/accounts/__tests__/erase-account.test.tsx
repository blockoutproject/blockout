import { useLayoutEffect, type PropsWithChildren } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { PermissionStatus } from "expo";
import * as Notifications from "expo-notifications";
import { Pressable, Text } from "react-native";
import { CredentialsManagerErrorCodes } from "react-native-auth0";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { TECHNICAL_ERROR } from "@/shared/components/error-copy";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import { applicationAccessResponse as mockApplicationAccessResponse } from "@/shared/api/test-support/application-access";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { NotificationLifecycle } from "@/features/notifications/native/notification-lifecycle";
import {
  createPushRegistration,
  type PushRegistration,
} from "@/features/notifications/native/push-registration";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { AccessAdmissionProvider } from "@/features/access/queries/use-access-admission";
import { AccountFeedbackProvider } from "../test-support/account-feedback-provider";
import { accountResponse } from "../test-support/account-response";
import { credentialsFor, mockAuth0 } from "../test-support/native-auth0";
import { ProfileScreen } from "../screens/profile-screen";
import EraseAccountRoute from "@/app/(ordinary)/(tabs)/(profile)/profile/(forms)/erase";
import {
  getGetApplicationAccessQueryKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";

// Router, Auth0, Query, push lifecycle and generated transport are real; only I/O is controlled.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    ...jest.requireActual("expo-constants").default,
    easConfig: { projectId: "synthetic-project" },
  },
}));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  getLastNotificationResponse: jest.fn().mockReturnValue(null),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, request?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(Response.json(mockApplicationAccessResponse()))
      : mockFetch(url, request),
}));

const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let publicClient = createQueryClient();
let privateClient = publicClient;
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000284",
  username: "Demo284",
});
const accountUrl = `https://api.example.invalid/accounts/${account.accountId}`;
const currentAccountUrl = "https://api.example.invalid/accounts/me";
const previousEnvironment = { ...process.env };

beforeEach(() => {
  publicClient = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|one"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset().mockResolvedValue(credentialsFor("auth0|two"));
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout
    .mockReset()
    .mockRejectedValue(new Error("Browser logout unavailable"));
  jest.mocked(Notifications.getPermissionsAsync).mockReset().mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: PermissionStatus.GRANTED,
    expires: "never",
  });
  jest
    .mocked(Notifications.getExpoPushTokenAsync)
    .mockReset()
    .mockResolvedValue({ type: "expo", data: "ExponentPushToken[synthetic]" });
  mockFetch.mockReset().mockImplementation(async () => Response.json(account));
});
afterEach(async () => {
  await cleanup();
  privateClient.clear();
  publicClient.clear();
  process.env = { ...previousEnvironment };
});

/** Observes the real private cache without replacing its subject-keyed ownership. */
function PrivateQueries({ children }: Readonly<PropsWithChildren>) {
  const client = useQueryClient();
  client.setQueryDefaults([], { retry: false, gcTime: Infinity });
  useLayoutEffect(() => {
    privateClient = client;
  }, [client]);
  return children;
}

/** Guest-home probe verifies the actual SDK state after route replacement. */
function Home() {
  const session = useAccountSession();
  return (
    <Text>
      {session.status === "guest" ? "Accueil invité" : "Accueil connecté"}
    </Text>
  );
}

/** Explicit native account switch exercises disposal of A's actual route and command callbacks. */
function SessionSwitch() {
  const session = useAccountSession();
  return (
    <>
      <Text>{`Sujet : ${session.subject}`}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Changer de compte"
        onPress={() => void session.signIn("test-audience")}
      >
        <Text>Changer de compte</Text>
      </Pressable>
    </>
  );
}

/** Real public access changes may remove the ordinary form while its command is already in flight. */
function OrdinaryRoutes({
  registration,
}: Readonly<{ registration?: PushRegistration }>) {
  return (
    <AccessAdmissionProvider>
      <AccountFeedbackProvider>
        {registration && (
          <NotificationLifecycle registration={registration} enabled />
        )}
        <SessionSwitch />
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      </AccountFeedbackProvider>
    </AccessAdmissionProvider>
  );
}

/** Mounts the Profile stack with ordinary admission and real session feedback. */
async function openProfile(registration?: PushRegistration) {
  await renderRouter(
    {
      _layout: () => (
        <AccountSessionProvider
          preparePushRemoval={registration?.prepareRemoval}
          abandonPushRegistration={registration?.abandon}
        >
          <PrivateQueries>
            <OrdinaryRoutes registration={registration} />
          </PrivateQueries>
        </AccountSessionProvider>
      ),
      "(ordinary)/(tabs)/(home)/(personal)/index": Home,
      "profile/index": () => <ProfileScreen admitted proEntry={null} />,
      "profile/erase": EraseAccountRoute,
    },
    {
      initialUrl: "/profile",
      wrapper: ({ children }) => (
        <QueryClientProvider client={publicClient}>
          <ThemeProvider>
            <ApplicationAccessProvider>{children}</ApplicationAccessProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ),
    },
  );
  return userEvent.setup();
}

/** Opens the actual erasure route through the Profile action. */
async function openErasure(registration?: PushRegistration) {
  const user = await openProfile(registration);
  await user.press(
    await screen.findByRole("button", { name: "Supprimer mon compte" }),
  );
  await screen.findByRole("header", { name: "Supprimer mon compte ?" });
  return user;
}

/** Supplies the transport responses for a real registration and subsequent departure. */
function mockDepartureTransport(lostPushResponse = false) {
  mockFetch.mockImplementation(async (url, request) => {
    if (request?.method === "PUT") {
      if (lostPushResponse) {
        throw new TypeError("Lost registration response");
      }
      return Response.json({
        id: String(url).split("/").at(-1),
        installationId: JSON.parse(String(request.body)).installationId,
      });
    }
    if (request?.method === "DELETE") {
      return new Response(null, {
        status: String(url) === accountUrl ? 204 : 404,
      });
    }
    return Response.json(account);
  });
}

/** Captures effective departure I/O after the original registration has settled. */
function departureOperations() {
  return {
    writes: mockFetch.mock.calls.flatMap(([url, request]) =>
      request?.method === "PUT" || request?.method === "DELETE"
        ? [
            [
              request.method,
              String(url) === accountUrl ? "account" : "push subscription",
            ],
          ]
        : [],
    ),
    credentialReads: mockAuth0.getCredentials.mock.calls.length,
    nativeClears: mockAuth0.clearCredentials.mock.calls.length,
    browserLogouts: mockAuth0.webAuthLogout.mock.calls.length,
  };
}

it("requires the checkbox, keeps plain store guidance and cancels without deleting or signing out", async () => {
  // Given
  const user = await openErasure();

  // When
  const deletion = screen.getByRole("button", { name: "Supprimer mon compte" });

  // Then
  expect(deletion).toBeDisabled();
  expect(
    screen.getByText(
      "Votre compte et vos données seront supprimés définitivement.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Supprimer le compte ne résilie pas votre abonnement Pro : gérez-le dans l’App Store ou Google Play.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("link")).toBeNull();

  // When
  await user.press(screen.getByRole("checkbox", { checked: false }));

  // Then
  expect(screen.getByRole("checkbox", { checked: true })).toBeOnTheScreen();
  expect(deletion).toBeEnabled();

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));

  // Then
  expect(screen).toHavePathname("/profile");
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
  ).toBe(true);
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});

it.each(["explicit", "background"] as const)(
  "keeps the confirmation behind its required-read card during %s reading",
  async (retry) => {
    // Given: the real route, RHF and Query retain the original account and checked confirmation.
    const user = await openErasure();
    await user.press(screen.getByRole("checkbox"));
    mockFetch.mockResolvedValue(
      Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        { status: 503 },
      ),
    );

    // When
    await act(() =>
      privateClient.refetchQueries({
        queryKey: getGetMyAccountQueryKey(),
        exact: true,
      }),
    );

    // Then
    const card = await screen.findByRole("alert", {
      name: "Une erreur est survenue",
    });
    expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Supprimer mon compte" }),
    ).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Retour" })).toBeEnabled();
    expect(privateClient.getQueryData(getGetMyAccountQueryKey())).toEqual(
      account,
    );

    const response = Promise.withResolvers<Response>();
    mockFetch.mockClear().mockReturnValue(response.promise);
    let reading: Promise<void> | undefined;
    try {
      // When: a background request does not impersonate the card's explicit Retry gesture.
      if (retry === "explicit") {
        await user.press(screen.getByRole("button", { name: "Réessayer" }));
      } else {
        await act(async () => {
          reading = privateClient.refetchQueries({
            queryKey: getGetMyAccountQueryKey(),
            exact: true,
          });
        });
      }

      // Then
      await waitFor(() => expect(privateClient.isFetching()).toBe(1));
      expect(card).toBeOnTheScreen();
      expect(
        await screen.findByRole("button", {
          name: "Réessayer",
          busy: retry === "explicit",
        }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByLabelText("Chargement de la suppression du compte"),
      ).not.toBeOnTheScreen();
      expect(
        mockFetch.mock.calls.map(([url, request]) => [
          String(url),
          request?.method,
        ]),
      ).toEqual([["https://api.example.invalid/accounts/me", "GET"]]);

      // When
      await act(async () => {
        response.resolve(Response.json(account));
        await reading;
      });

      // Then: restoring the read reveals the existing RHF value without sending DELETE.
      expect(
        await screen.findByRole("checkbox", { checked: true }),
      ).toBeEnabled();
      expect(
        screen.getByRole("button", { name: "Supprimer mon compte" }),
      ).toBeEnabled();
      expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        response.resolve(Response.json(account));
        await reading;
      });
    }
  },
);

it.each(["refused", "lost-response"])(
  "retains the confirmation after %s and sends again only on an explicit action",
  async (outcome) => {
    // Given
    const user = await openErasure();
    mockFetch.mockClear();
    if (outcome === "lost-response") {
      mockFetch.mockRejectedValue(new TypeError("Lost response"));
    } else {
      mockFetch.mockResolvedValue(new Response(null, { status: 403 }));
    }
    await user.press(screen.getByRole("checkbox"));

    // When
    await user.press(
      screen.getByRole("button", { name: "Supprimer mon compte" }),
    );

    // Then
    expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
    expect(screen).toHavePathname("/profile/erase");
    expect(screen.getByRole("checkbox", { checked: true })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Supprimer mon compte" }),
    ).toBeEnabled();
    expect(
      mockFetch.mock.calls.map(([url, request]) => [
        String(url),
        request?.method,
      ]),
    ).toEqual([
      [`https://api.example.invalid/accounts/${account.accountId}`, "DELETE"],
    ]);
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();

    // When
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await user.press(
      screen.getByRole("button", { name: "Supprimer mon compte" }),
    );

    // Then
    expect(await screen.findByText("Accueil invité")).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.map(([url, request]) => [
        String(url),
        request?.method,
      ]),
    ).toEqual([
      [`https://api.example.invalid/accounts/${account.accountId}`, "DELETE"],
      [`https://api.example.invalid/accounts/${account.accountId}`, "DELETE"],
    ]);
    expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  },
);

it("returns directly to guest home on 204 even when browser logout is unavailable", async () => {
  // Given: 204 is authoritative even when backend provider cleanup failed.
  mockDepartureTransport();
  const user = await openErasure(createPushRegistration());
  await waitFor(() =>
    expect(departureOperations().writes).toEqual([
      ["PUT", "push subscription"],
    ]),
  );
  const originalClient = privateClient;
  originalClient.setQueryData(["private-example"], "private-data");
  mockFetch.mockClear();
  mockAuth0.getCredentials.mockClear();
  await user.press(screen.getByRole("checkbox"));

  // When
  await user.press(
    screen.getByRole("button", { name: "Supprimer mon compte" }),
  );

  // Then
  expect(await screen.findByText("Accueil invité")).toBeOnTheScreen();
  expect(screen).toHavePathname("/");
  expect(departureOperations()).toEqual({
    writes: [["DELETE", "account"]],
    credentialReads: 1,
    nativeClears: 1,
    browserLogouts: 0,
  });
  await waitFor(() =>
    expect(originalClient.getQueryCache().getAll()).toHaveLength(0),
  );
  expect(screen.queryByText(TECHNICAL_ERROR)).toBeNull();
  expect(jest.mocked(initializeV2Installation)).toHaveBeenCalledTimes(1);
});

it("retries only native departure when storage refuses local clearing after 204", async () => {
  // Given
  mockDepartureTransport();
  const localRetry = Promise.withResolvers<void>();
  mockAuth0.clearCredentials
    .mockRejectedValueOnce({
      code: CredentialsManagerErrorCodes.STORE_FAILED,
      message: "Storage unavailable",
    })
    .mockReturnValueOnce(localRetry.promise);
  const user = await openErasure(createPushRegistration());
  await waitFor(() =>
    expect(departureOperations().writes).toEqual([
      ["PUT", "push subscription"],
    ]),
  );
  mockFetch.mockClear();
  mockAuth0.getCredentials.mockClear();
  await user.press(screen.getByRole("checkbox"));

  // When
  await user.press(
    screen.getByRole("button", { name: "Supprimer mon compte" }),
  );

  // Then
  expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
  expect(screen).toHavePathname("/profile/erase");
  expect(screen.queryByText("Accueil invité")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Supprimer mon compte" }),
  ).not.toBeOnTheScreen();
  const retry = screen.getByRole("button", { name: "Réessayer" });
  expect(retry).toBeEnabled();
  expect(departureOperations()).toEqual({
    writes: [["DELETE", "account"]],
    credentialReads: 1,
    nativeClears: 1,
    browserLogouts: 0,
  });
  expect(mockFetch).toHaveBeenCalledTimes(1);

  try {
    // When
    await user.press(retry);

    // Then
    expect(
      await screen.findByRole("button", { name: "Réessayer", busy: true }),
    ).toBeDisabled();
    expect(screen).toHavePathname("/profile/erase");
    expect(departureOperations()).toEqual({
      writes: [["DELETE", "account"]],
      credentialReads: 1,
      nativeClears: 2,
      browserLogouts: 0,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // When
    await act(() => localRetry.resolve());

    // Then
    expect(await screen.findByText("Accueil invité")).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
  } finally {
    await act(() => localRetry.resolve());
  }
});

it.each([
  { registration: "accepted", browser: "success", sent: true, tokenReads: 1 },
  {
    registration: "lost response",
    browser: "cancelled",
    sent: true,
    tokenReads: 1,
  },
  {
    registration: "denied permission",
    browser: "success",
    sent: false,
    tokenReads: 0,
  },
  {
    registration: "failed token",
    browser: "success",
    sent: false,
    tokenReads: 1,
  },
] as const)(
  "preserves $browser browser logout with $registration push registration",
  async ({ registration, browser, sent, tokenReads }) => {
    // Given
    mockDepartureTransport(registration === "lost response");
    if (registration === "denied permission") {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
        granted: false,
        canAskAgain: true,
        status: PermissionStatus.UNDETERMINED,
        expires: "never",
      });
      jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({
        granted: false,
        canAskAgain: false,
        status: PermissionStatus.DENIED,
        expires: "never",
      });
    }
    if (registration === "failed token") {
      jest
        .mocked(Notifications.getExpoPushTokenAsync)
        .mockRejectedValueOnce(new Error("Native token unavailable"));
    }
    const browserResponse = Promise.withResolvers<void>();
    mockAuth0.webAuthLogout.mockReturnValueOnce(browserResponse.promise);
    const user = await openProfile(createPushRegistration());
    const signOut = await screen.findByRole("button", {
      name: "Se déconnecter",
    });
    await waitFor(() => {
      expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(
        registration === "denied permission" ? 1 : 0,
      );
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(
        tokenReads,
      );
      expect(departureOperations().writes).toEqual(
        sent ? [["PUT", "push subscription"]] : [],
      );
    });
    const registeredUrl = mockFetch.mock.calls.find(
      ([, request]) => request?.method === "PUT",
    )?.[0];
    mockFetch.mockClear();
    mockAuth0.getCredentials.mockClear();

    try {
      // When
      await user.press(signOut);

      // Then: the Profile remains mounted until the browser actually returns.
      await waitFor(() =>
        expect(mockAuth0.webAuthLogout).toHaveBeenCalledTimes(1),
      );
      expect(screen).toHavePathname("/profile");
      expect(screen.queryByText("Accueil invité")).not.toBeOnTheScreen();
      expect(departureOperations()).toEqual({
        writes: sent ? [["DELETE", "push subscription"]] : [],
        credentialReads: sent ? 1 : 0,
        nativeClears: 0,
        browserLogouts: 1,
      });
      if (registeredUrl) {
        expect(mockFetch).toHaveBeenCalledWith(
          registeredUrl,
          expect.objectContaining({ method: "DELETE" }),
        );
      }

      // When
      await act(() => {
        if (browser === "success") {
          browserResponse.resolve();
        } else {
          browserResponse.reject({
            code: "a0.session.user_cancelled",
            message: "Cancelled",
          });
        }
      });

      // Then
      if (browser === "success") {
        expect(await screen.findByText("Accueil invité")).toBeOnTheScreen();
        expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
      } else {
        expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
        expect(screen).toHavePathname("/profile");
        expect(
          screen.getByRole("button", { name: "Se déconnecter" }),
        ).toBeEnabled();
        expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
      }
    } finally {
      await act(() => browserResponse.resolve());
    }
  },
);

it("keeps one pending request and prevents cancellation until its result is known", async () => {
  // Given
  const user = await openErasure();
  const response = Promise.withResolvers<Response>();
  mockFetch.mockClear().mockReturnValue(response.promise);
  await user.press(screen.getByRole("checkbox"));
  try {
    // When
    await user.press(
      screen.getByRole("button", { name: "Supprimer mon compte" }),
    );
    await user.press(
      screen.getByRole("button", { name: "Supprimer mon compte", busy: true }),
    );
    await user.press(screen.getByRole("button", { name: "Annuler" }));
    await user.press(screen.getByRole("button", { name: "Retour" }));

    // Then
    expect(screen).toHavePathname("/profile/erase");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();

    // When
    await act(() => response.resolve(new Response(null, { status: 204 })));

    // Then
    expect(await screen.findByText("Accueil invité")).toBeOnTheScreen();
    expect(mockFetch.mock.calls[0]?.[1]?.body).toBeUndefined();
    expect(
      new Headers(mockFetch.mock.calls[0]?.[1]?.headers).get("Authorization"),
    ).toBe("Bearer test-access-token");
  } finally {
    await act(() => response.resolve(new Response(null, { status: 204 })));
  }
});

it.each([
  { pending: "credentials", replacementOwner: "new subject" },
  { pending: "acknowledgment", replacementOwner: "new subject" },
  { pending: "acknowledgment", replacementOwner: "same subject" },
] as const)(
  "leaves the replacement account ($replacementOwner) untouched after A's late $pending",
  async ({ pending, replacementOwner }) => {
    // Given
    const user = await openErasure();
    const originalCredentials = credentialsFor("auth0|one");
    const delayedCredentials =
      Promise.withResolvers<typeof originalCredentials>();
    const response = Promise.withResolvers<Response>();
    const replacement = accountResponse({
      accountId: "00000000-0000-4000-8000-000000000285",
      username: "Demo285",
      permissions: { ...account.permissions, manageMaintenance: true },
    });
    mockFetch
      .mockClear()
      .mockImplementation(async (_url, request) =>
        request?.method === "DELETE"
          ? response.promise
          : Response.json(replacement),
      );
    mockAuth0.getCredentials.mockClear();
    if (pending === "credentials") {
      mockAuth0.getCredentials.mockReturnValueOnce(delayedCredentials.promise);
    }
    await user.press(screen.getByRole("checkbox"));

    try {
      // When
      await user.press(
        screen.getByRole("button", { name: "Supprimer mon compte" }),
      );

      // Then
      expect(departureOperations()).toEqual({
        writes: pending === "credentials" ? [] : [["DELETE", "account"]],
        credentialReads: 1,
        nativeClears: 0,
        browserLogouts: 0,
      });

      // When
      const subject =
        replacementOwner === "new subject" ? "auth0|two" : "auth0|one";
      if (replacementOwner === "new subject") {
        mockAuth0.getCredentials.mockResolvedValue(credentialsFor(subject));
        await user.press(
          screen.getByRole("button", { name: "Changer de compte" }),
        );
      } else {
        await act(() =>
          privateClient.refetchQueries({
            queryKey: getGetMyAccountQueryKey(),
            exact: true,
          }),
        );
      }
      await waitFor(() =>
        expect(privateClient.getQueryData(getGetMyAccountQueryKey())).toEqual(
          replacement,
        ),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        currentAccountUrl,
        expect.objectContaining({ method: "GET" }),
      );
      mockFetch.mockClear();
      mockAuth0.getCredentials.mockClear();
      await act(() => {
        delayedCredentials.resolve(originalCredentials);
        response.resolve(new Response(null, { status: 204 }));
      });

      // Then
      expect(screen.getByText(`Sujet : ${subject}`)).toBeOnTheScreen();
      expect(privateClient.getQueryData(getGetMyAccountQueryKey())).toEqual(
        replacement,
      );
      expect(departureOperations()).toEqual({
        writes: [],
        credentialReads: 0,
        nativeClears: 0,
        browserLogouts: 0,
      });
      expect(screen.queryByText("Accueil invité")).toBeNull();
      if (replacementOwner === "same subject") {
        expect(
          await screen.findByRole("button", {
            name: "Réessayer",
            disabled: true,
          }),
        ).toBeDisabled();
      }
    } finally {
      await act(() => {
        delayedCredentials.resolve(originalCredentials);
        response.resolve(new Response(null, { status: 204 }));
      });
    }
  },
);

it("still clears A after admission removes the pending confirmation", async () => {
  // Given
  const user = await openErasure();
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === "DELETE" ? response.promise : Response.json(account),
  );
  await user.press(screen.getByRole("checkbox"));
  await user.press(
    screen.getByRole("button", { name: "Supprimer mon compte" }),
  );
  try {
    // When
    await act(() =>
      publicClient.setQueryData(getGetApplicationAccessQueryKey(), {
        ...mockApplicationAccessResponse(),
        maintenance: {
          active: true,
          message: null,
          imageUrl: null,
        },
      }),
    );
    await screen.findByRole("alert", { name: "Une erreur est survenue" });
    await act(() => response.resolve(new Response(null, { status: 204 })));

    // Then
    expect(await screen.findByText("Accueil invité")).toBeOnTheScreen();
    expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  } finally {
    await act(() => response.resolve(new Response(null, { status: 204 })));
  }
});

it("rejects another principal's credentials before dispatching deletion", async () => {
  // Given
  const user = await openErasure();
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|two"));
  mockFetch.mockClear();
  await user.press(screen.getByRole("checkbox"));

  // When
  await user.press(
    screen.getByRole("button", { name: "Supprimer mon compte" }),
  );

  // Then
  expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});

it.each(["absent", "replacement"])(
  "keeps the original target unavailable when a current-account read becomes %s",
  async (state) => {
    // Given
    const user = await openErasure();
    await user.press(screen.getByRole("checkbox"));
    mockFetch.mockResolvedValue(
      state === "absent"
        ? Response.json(
            {
              type: "urn:blockout:problem:not-found",
              title: "Not found",
              status: 404,
            },
            {
              status: 404,
              headers: { "Content-Type": "application/problem+json" },
            },
          )
        : Response.json({
            ...account,
            accountId: "00000000-0000-4000-8000-000000000999",
          }),
    );

    // When
    await act(() =>
      privateClient.refetchQueries({
        queryKey: getGetMyAccountQueryKey(),
        exact: true,
      }),
    );
    mockFetch.mockClear();

    // Then
    if (state === "absent") {
      expect(
        await screen.findByRole("button", { name: "Créer mon compte" }),
      ).toBeEnabled();
      expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Supprimer mon compte" }),
      ).not.toBeOnTheScreen();
    } else {
      await user.press(
        screen.getByRole("button", { name: "Supprimer mon compte" }),
      );
      expect(screen.getByRole("checkbox", { checked: true })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Supprimer mon compte" }),
      ).toBeDisabled();
    }
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  },
);

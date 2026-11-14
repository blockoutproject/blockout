import { useLayoutEffect, type PropsWithChildren } from "react";
import {
  onlineManager,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Pressable, Text } from "react-native";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { TECHNICAL_ERROR } from "@/shared/components/error-copy";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import { applicationAccessResponse as mockApplicationAccessResponse } from "@/shared/api/test-support/application-access";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
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

// Router, Auth0 reducer, Query and generated transport are real; only native/network I/O is controlled.
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
function OrdinaryRoutes() {
  return (
    <AccessAdmissionProvider>
      <AccountFeedbackProvider>
        <SessionSwitch />
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      </AccountFeedbackProvider>
    </AccessAdmissionProvider>
  );
}

/** Opens the actual erasure route from Profile with ordinary admission and real feedback. */
async function openErasure() {
  await renderRouter(
    {
      _layout: () => (
        <AccountSessionProvider>
          <PrivateQueries>
            <OrdinaryRoutes />
          </PrivateQueries>
        </AccountSessionProvider>
      ),
      index: Home,
      "profile/index": () => (
        <ProfileScreen admitted proEntry={null} privacyEntry={null} />
      ),
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
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Supprimer mon compte" }),
  );
  await screen.findByRole("header", { name: "Supprimer mon compte ?" });
  return user;
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

it("keeps the same required-read card idle while Retry is paused and restores the checkbox after resume", async () => {
  // Given
  const user = await openErasure();
  await user.press(screen.getByRole("checkbox"));
  mockFetch.mockRejectedValue(new TypeError("Account read unavailable"));
  await act(() =>
    privateClient.refetchQueries({
      queryKey: getGetMyAccountQueryKey(),
      exact: true,
    }),
  );
  const card = await screen.findByRole("alert", {
    name: "Une erreur est survenue",
  });
  const response = Promise.withResolvers<Response>();
  mockFetch.mockClear().mockReturnValue(response.promise);
  try {
    // When
    await act(() => onlineManager.setOnline(false));
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    await waitFor(() =>
      expect(
        privateClient.getQueryState(getGetMyAccountQueryKey())?.fetchStatus,
      ).toBe("paused"),
    );
    expect(card).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();

    // When
    await act(() => onlineManager.setOnline(true));

    // Then
    expect(
      await screen.findByRole("button", { name: "Réessayer", busy: true }),
    ).toBeOnTheScreen();
    expect(card).toBeOnTheScreen();
    await act(() => response.resolve(Response.json(account)));
    expect(
      await screen.findByRole("checkbox", { checked: true }),
    ).toBeEnabled();
    expect(
      mockFetch.mock.calls.map(([url, request]) => [
        String(url),
        request?.method,
      ]),
    ).toEqual([["https://api.example.invalid/accounts/me", "GET"]]);
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  } finally {
    await act(async () => {
      onlineManager.setOnline(true);
      response.resolve(Response.json(account));
      await privateClient.cancelQueries();
    });
  }
});

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
  const user = await openErasure();
  const originalClient = privateClient;
  originalClient.setQueryData(["private-example"], "private-data");
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
  await user.press(screen.getByRole("checkbox"));

  // When
  await user.press(
    screen.getByRole("button", { name: "Supprimer mon compte" }),
  );

  // Then
  expect(await screen.findByText("Accueil invité")).toBeOnTheScreen();
  expect(screen).toHavePathname("/");
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  expect(mockAuth0.webAuthLogout).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(originalClient.getQueryCache().getAll()).toHaveLength(0),
  );
  expect(screen.queryByText(TECHNICAL_ERROR)).toBeNull();
  expect(jest.mocked(initializeV2Installation)).toHaveBeenCalledTimes(1);
});

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

it("does not clear a replacement principal when A's already dispatched deletion completes", async () => {
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
    mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|two"));
    await user.press(screen.getByRole("button", { name: "Changer de compte" }));
    await screen.findByText("Sujet : auth0|two");
    await act(() => response.resolve(new Response(null, { status: 204 })));

    // Then
    expect(screen.getByText("Sujet : auth0|two")).toBeOnTheScreen();
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    expect(screen.queryByText("Accueil invité")).toBeNull();
  } finally {
    await act(() => response.resolve(new Response(null, { status: 204 })));
  }
});

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
          revision: 1,
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
        await screen.findByRole("button", { name: "Se connecter" }),
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

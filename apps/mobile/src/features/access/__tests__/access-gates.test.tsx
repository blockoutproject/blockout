import { accountResponse } from "@/features/accounts/test-support/account-response";
import { focusManager, onlineManager } from "@tanstack/react-query";
import {
  cleanup,
  act,
  fireEvent,
  screen,
  waitFor,
  userEvent,
} from "@testing-library/react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { AppState, Text, Pressable, type AppStateStatus } from "react-native";
import type { ComponentType } from "react";
import { CredentialsManagerErrorCodes } from "react-native-auth0";
import { AccessGateScreen } from "../screens/access-gate-screen";
import NotFoundRoute from "@/app/+not-found";
import OperationsLayout from "@/app/(operations)/_layout";
import AdministrationRoute from "@/app/(operations)/administration";
import RootLayout from "@/app/_layout";
import EntryRoute from "@/app/index";
import OrdinaryLayout from "@/app/(ordinary)/_layout";
import RecoveryLayout from "@/app/(recovery)/_layout";
import SignInRoute from "@/app/(recovery)/sign-in";
import OnboardingRoute from "@/app/onboarding";
import SupportLayout from "@/app/(recovery)/support/_layout";
import SupportRoute from "@/app/(recovery)/support/index";
import SupportChoiceRoute from "@/app/(recovery)/support/choice";
import { completeDiscovery } from "@/features/onboarding/discovery-state";
import { useAccountSession } from "@/features/accounts/current-account";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";

// The real support form uses the shared keyboard owner; its native I/O uses the upstream Jest boundary.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);

// Native manifest projection of the documented expo-router plugin option in app.config.ts.
jest.mock("expo-constants", () => {
  const actual = jest.requireActual("expo-constants");
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      expoConfig: {
        ...actual.default.expoConfig,
        extra: {
          ...actual.default.expoConfig?.extra,
          router: { sitemap: false },
        },
      },
    },
  };
});
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
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const environment = { ...process.env };

// These route scenarios start after common discovery has been explicitly completed.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
beforeEach(async () => {
  jest.useFakeTimers();
  await completeDiscovery();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "https://api.example.invalid",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator180"));
  mockAuth0.webAuth.mockReset();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset();
});
afterEach(async () => {
  await cleanup();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  process.env = { ...environment };
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Mounts real root, ordinary and operational admission; unrelated business destinations are route probes. */
async function openRoute(
  path: string,
  signIn: typeof SignInProbe = SignInProbe,
) {
  const view = await renderRouter(
    {
      _layout: () => <RootLayout />,
      index: EntryRoute,
      onboarding: OnboardingRoute,
      "age-declaration": () => <Text>Age declaration</Text>,
      "(ordinary)/_layout": OrdinaryLayout,
      "(recovery)/_layout": RecoveryLayout,
      "(ordinary)/(tabs)/_layout": () => <Stack />,
      "(operations)/_layout": OperationsLayout,
      access: AccessGateScreen,
      "+not-found": NotFoundRoute,
      "(ordinary)/(tabs)/(home)/(personal)/index": () => (
        <Text>Ordinary home</Text>
      ),
      "(ordinary)/matches/[matchId]": MatchProbe,
      "(ordinary)/privacy": () => null,
      "(ordinary)/privacy-age": () => null,
      "(ordinary)/pro": () => null,
      "(ordinary)/sign-in-invitation": () => null,
      "(recovery)/support/_layout": SupportLayout,
      "(recovery)/support/index": SupportRoute,
      "(recovery)/support/choice": SupportChoiceRoute,
      "(recovery)/sign-in": signIn,
      "(operations)/collection": () => null,
      "(operations)/administration/application-versions": () => null,
      "(operations)/administration/classification/[kind]/[id]": () => null,
      "(operations)/administration/classification-selection": () => null,
      "(operations)/administration/divisions/index": () => null,
      "(operations)/administration/divisions/[id]": () => null,
      "(operations)/administration/divisions/new": () => null,
      "(operations)/administration/presentation/[kind]/[id]": () => null,
      "(operations)/administration/index": AdministrationRoute,
      "(operations)/administration/maintenance": () => (
        <Text>Maintenance editor</Text>
      ),
    },
    { initialUrl: path },
  );
  // Native read recovery has three bounded backoff delays before the terminal error state.
  await act(async () => jest.advanceTimersByTimeAsync(8_000));
  return view;
}

/** Exposes the exact direct-link destination without replacing the production admission owners. */
function MatchProbe() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return <Text>Match destination {matchId}</Text>;
}

it("opens the actual shared support route as a guest without acquiring credentials", async () => {
  // Given
  mockFetch.mockResolvedValue(Response.json(applicationAccessResponse()));

  // When
  await openRoute("/support?originScreen=profile");

  // Then
  expect(
    await screen.findByRole("header", { name: "Assistance et suggestions" }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("E-mail de réponse")).toHaveDisplayValue("");
  expect(screen.getByText("Profil")).toBeOnTheScreen();
  expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
});

it("starts the public request while F14 initialization has not completed", async () => {
  // Given
  const initialization = Promise.withResolvers<void>();
  jest.mocked(initializeV2Installation).mockReturnValue(initialization.promise);
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(applicationAccessResponse()), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  try {
    // When
    await openRoute("/support");

    // Then
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.invalid/application-access",
        expect.anything(),
      ),
    );
    expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
    expect(screen.queryByText("Illustration à définir")).toBeNull();
  } finally {
    // Cleanup: release initialization only after consumers have unmounted.
    await cleanup();
    await act(async () => initialization.resolve());
  }
});

it.each(["/support", "/sign-in", "/administration"])(
  "refuses the direct route %s after an unavailable public check",
  async (path) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    mockFetch.mockRejectedValue(new Error("Unavailable"));

    // When
    await openRoute(path);

    // Then
    expect(
      await screen.findByRole("alert", {
        name: "Une erreur est survenue",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
    expect(screen.queryByText("Illustration à définir")).toBeNull();
    expect(
      screen.queryByText(/^(Support|Legal|Sign-in|Operational) route$/),
    ).toBeNull();
    expect(screen.queryByLabelText("E-mail de réponse")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continuer en tant qu’invité" }),
    ).toBeNull();
  },
);

it("keeps the current complete check on native focus and reconnect", async () => {
  // Given
  const full = applicationAccessResponse();
  mockFetch.mockImplementation(async () => Response.json(full));
  await openRoute("/");
  await screen.findByText("Sign-in route");
  full.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };

  // When
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
  });

  // Then
  expect(screen.getByText("Sign-in route")).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it.each(["maintenance", "update"] as const)(
  "shows only read failure while keeping the known %s restriction until a complete recovery",
  async (restriction) => {
    // Given: real admission and transport validation with controlled HTTP I/O.
    const full = applicationAccessResponse();
    full.maintenance.active = restriction === "maintenance";
    full.maintenance.message = "Service maintenance";
    full.versions.ios = {
      minimumVersion: "2.10.0",
      storeUrl: "https://apps.apple.com/app/id123",
    };
    mockFetch.mockResolvedValue(json(full));
    const user = userEvent.setup();
    await openRoute("/support");
    const title =
      restriction === "maintenance"
        ? "Blockout est en maintenance"
        : "Mets Blockout à jour.";
    await screen.findByRole("header", { name: title });
    mockFetch.mockRejectedValue(new Error("Complete check unavailable"));

    // When
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await act(async () => jest.advanceTimersByTimeAsync(8_000));

    // Then
    expect(
      await screen.findByRole("alert", { name: "Une erreur est survenue" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: title })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Mettre à jour l’application" }),
    ).toBeNull();
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
    expect(screen.queryByText("Ordinary home")).toBeNull();
    expect(screen.queryByLabelText("E-mail de réponse")).toBeNull();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
    expect(mockFetch).toHaveBeenCalledTimes(5);

    // When
    const retry = Promise.withResolvers<Response>();
    mockFetch.mockReturnValue(retry.promise);
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(screen.getByRole("alert")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeBusy();
    expect(screen.queryByRole("header", { name: title })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Mettre à jour l’application" }),
    ).toBeNull();

    // When
    await act(async () => retry.resolve(json(full)));

    // Then: a successful complete read restores the applicable gate and its actions.
    expect(
      await screen.findByRole("header", { name: title }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Ordinary home")).toBeNull();
    if (restriction === "update") {
      expect(
        screen.getByRole("button", { name: "Mettre à jour l’application" }),
      ).toBeEnabled();
    }

    // When: a later explicit complete read confirms that every restriction is lifted.
    mockFetch.mockImplementation(async () => json(applicationAccessResponse()));
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    expect(await screen.findByText("Sign-in route")).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      mockFetch.mock.calls.every(
        ([url, options]) =>
          String(url).endsWith("/application-access") &&
          options?.method === "GET",
      ),
    ).toBe(true);
  },
);

it("keeps access closed when the installed native version is unreadable", async () => {
  // Given
  jest.replaceProperty(
    jest.requireMock("expo-application"),
    "nativeApplicationVersion",
    null,
  );
  const full = applicationAccessResponse();
  full.versions.ios = {
    minimumVersion: "1.0.0",
    storeUrl: "https://apps.apple.com/app/id123",
  };
  mockFetch.mockResolvedValue(json(full));

  // When
  await openRoute("/administration/maintenance");

  // Then
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  expect(screen.queryByText("Maintenance editor")).toBeNull();
  expect(
    screen.queryByRole("link", { name: "Accès administrateur" }),
  ).toBeNull();

  // When: a complete GET cannot repair installed binary metadata.
  const retry = Promise.withResolvers<Response>();
  mockFetch.mockReturnValue(retry.promise);
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(screen.getByRole("alert")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeBusy();

  // When
  await act(async () => retry.resolve(json(full)));

  // Then
  expect(screen.getByRole("alert")).toBeOnTheScreen();
  expect(screen.queryByText("Ordinary home")).toBeNull();
});

/** Complete canonical Fetch response; errors remain real transport errors. */
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type":
        status >= 200 && status < 300
          ? "application/json"
          : "application/problem+json",
    },
  });
}

const operator = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000180",
  username: "Operator_180",
  email: "operator@example.invalid",
  permissions: { manageMaintenance: true },
});

it.each(["maintenance", "update"] as const)(
  "keeps ordinary entry and support/sign-in routes behind the %s gate",
  async (restriction) => {
    // Given
    const full = applicationAccessResponse();
    if (restriction === "maintenance") {
      full.maintenance = {
        revision: 1,
        active: true,
        message: "Nous intervenons sur le service.",
        imageUrl: null,
      };
    } else {
      full.versions.ios = {
        minimumVersion: "2.10.0",
        storeUrl: "https://apps.apple.com/app/id123",
      };
    }
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    mockFetch.mockImplementation(async (url) =>
      String(url).endsWith("/accounts/me")
        ? new Response(null, { status: 503 })
        : json(full),
    );
    await openRoute("/support");
    const title =
      restriction === "maintenance"
        ? "Blockout est en maintenance"
        : "Mets Blockout à jour.";
    await screen.findByRole("header", { name: title });

    // When
    await act(async () => {
      router.push("/sign-in");
    });
    await act(async () => {
      router.push("/support");
    });
    await act(async () => {
      router.back();
    });

    // Then
    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.queryByText(/^(Support|Legal|Sign-in) route$/)).toBeNull();
    expect(screen.queryByLabelText("E-mail de réponse")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Accès administrateur" }),
    ).toBeNull();
    expect(screen.queryByText(/Aide|Assistance|Se connecter/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continuer en tant qu’invité" }),
    ).toBeNull();
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  },
);

it("admits a current maintenance manager without personal bypass only into operations", async () => {
  // Given
  const full = applicationAccessResponse();
  full.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async (url) =>
    json(String(url).endsWith("/accounts/me") ? operator : full),
  );
  const user = userEvent.setup();
  await openRoute("/");

  // When
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );

  // Then
  expect(
    await screen.findByRole("header", { name: "Administration technique" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Maintenance" })).toBeOnTheScreen();
  expect(screen.queryByText("Ordinary home")).toBeNull();
  expect(
    screen.queryByRole("button", {
      name: "Accéder à l’application pendant la maintenance",
    }),
  ).toBeNull();
});

it("displays maintenance first but refuses an outdated operator and every minimum bypass", async () => {
  // Given
  const full = applicationAccessResponse();
  full.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  full.versions.ios = {
    minimumVersion: "2.10.0",
    storeUrl: "https://apps.apple.com/app/id123",
  };
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async (url) =>
    json(
      String(url).endsWith("/accounts/me")
        ? {
            ...operator,
            permissions: { manageMaintenance: true, bypassMaintenance: true },
          }
        : full,
    ),
  );

  // When
  await openRoute("/administration/maintenance");

  // Then
  expect(
    await screen.findByRole("header", { name: "Blockout est en maintenance" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Accès administrateur" }),
  ).toBeNull();
  expect(screen.queryByText("Maintenance editor")).toBeNull();
});

it("refreshes maintenance and retries existing-account identification without interactive sign-in", async () => {
  // Given
  const full = applicationAccessResponse();
  full.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  let identificationFails = true;
  mockFetch.mockImplementation(async (url) => {
    if (String(url).endsWith("/accounts/me")) {
      if (identificationFails) {
        throw new Error("Transient identity outage");
      }
      return json(operator);
    }
    return json(full);
  });
  await openRoute("/");
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).endsWith("/accounts/me"),
      ),
    ).toBe(true),
  );
  expect(
    screen.queryByRole("link", { name: "Accès administrateur" }),
  ).toBeNull();
  const credentialsBefore = mockAuth0.getCredentials.mock.calls.length;

  // When
  identificationFails = false;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  ).toBeOnTheScreen();
  expect(mockAuth0.getCredentials.mock.calls.length).toBeGreaterThan(
    credentialsBefore,
  );
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/application-access"),
    ),
  ).toHaveLength(2);
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method === "GET"),
  ).toBe(true);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
});

it("opens the exact direct Match before the first account response and retains it after failure", async () => {
  // Given: the real Router/session owners remain mounted while HTTP alone is delayed.
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const firstRead = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? firstRead.promise
      : json(applicationAccessResponse()),
  );
  const matchId = "00000000-0000-4000-8000-000000000745";
  const destination = `/matches/${matchId}?source=notification&view=one&view=two#links`;

  try {
    // When
    await openRoute(destination);

    // Then
    expect(
      await screen.findByText(`Match destination ${matchId}`),
    ).toBeOnTheScreen();
    expect(screen).toHavePathnameWithParams(destination);
    expect(
      screen.queryByRole("button", { name: "Se connecter" }),
    ).not.toBeOnTheScreen();

    // When
    await act(() => firstRead.resolve(new Response(null, { status: 503 })));
    await act(async () => jest.advanceTimersByTimeAsync(8_000));

    // Then
    expect(screen.getByText(`Match destination ${matchId}`)).toBeOnTheScreen();
    expect(screen).toHavePathnameWithParams(destination);
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        String(url).endsWith("/application-access"),
      ),
    ).toHaveLength(1);
    expect(
      mockFetch.mock.calls.every(([, options]) => options?.method !== "POST"),
    ).toBe(true);
  } finally {
    await act(() => firstRead.resolve(new Response(null, { status: 503 })));
  }
});

it("opens ordinary Login without a session and reaches Home only after explicit guest continuation", async () => {
  // Given
  mockFetch.mockResolvedValue(json(applicationAccessResponse()));
  const user = userEvent.setup();
  await openRoute("/", SignInRoute);

  // Then
  expect(
    await screen.findByRole("button", { name: "Se connecter" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(screen.queryByText("Ordinary home")).not.toBeOnTheScreen();

  // When
  await user.press(
    screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
  );

  // Then
  expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
  expect(screen).toHavePathname("/");
  expect(
    screen.queryByRole("button", { name: "Se connecter" }),
  ).not.toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).endsWith("/accounts/me")),
  ).toBe(false);
});

it("opens Home before the first restored-account response", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const accountRead = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? accountRead.promise
      : json(applicationAccessResponse()),
  );

  try {
    // When
    await openRoute("/", SignInRoute);

    // Then: the route probe establishes native entry; Home owns its skeleton in its own suite.
    expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
    expect(
      screen.queryByRole("button", { name: "Se connecter" }),
    ).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).endsWith("/accounts/me"),
      ),
    ).toBe(true);
  } finally {
    await act(() => accountRead.resolve(json(operator)));
  }
});

it("keeps initial SDK resolution beneath the native splash before ordinary entry", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const credentials =
    Promise.withResolvers<ReturnType<typeof credentialsFor>>();
  mockAuth0.getCredentials.mockReturnValue(credentials.promise);
  mockFetch.mockImplementation(async (url) =>
    json(
      String(url).endsWith("/accounts/me")
        ? operator
        : applicationAccessResponse(),
    ),
  );

  try {
    // When
    await openRoute("/", SignInRoute);

    // Then
    expect(screen.queryByText("Ordinary home")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Se connecter" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

    // When
    await act(() => credentials.resolve(credentialsFor("auth0|operator180")));

    // Then
    expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
  } finally {
    await act(() => credentials.resolve(credentialsFor("auth0|operator180")));
  }
});

it("opens the ordinary Login with only the standard toast after technical SDK restoration failure", async () => {
  // Given: hold the SDK until the independent public startup check is complete.
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const restoration =
    Promise.withResolvers<ReturnType<typeof credentialsFor>>();
  mockAuth0.getCredentials.mockReturnValue(restoration.promise);
  mockFetch.mockResolvedValue(json(applicationAccessResponse()));
  await openRoute("/", SignInRoute);

  try {
    // When
    await act(() =>
      restoration.reject(new Error("Temporary SDK restoration failure")),
    );

    // Then
    expect(
      await screen.findByRole("button", { name: "Se connecter" }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByRole("alert", { name: "Une erreur est survenue." }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("Ordinary home")).not.toBeOnTheScreen();
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  } finally {
    await act(() => restoration.resolve(credentialsFor("auth0|operator180")));
  }
});

it("retains an admitted Match after a technical account reread failure", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const listeners = new Set<(state: AppStateStatus) => void>();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  });
  let accountUnavailable = false;
  mockFetch.mockImplementation(async (url) => {
    if (String(url).endsWith("/accounts/me")) {
      if (accountUnavailable) {
        return new Response(null, { status: 503 });
      }
      return json(operator);
    }
    return json(applicationAccessResponse());
  });
  const matchId = "00000000-0000-4000-8000-000000000745";
  await openRoute(`/matches/${matchId}`);
  await screen.findByText(`Match destination ${matchId}`);
  const accountReadsBefore = mockFetch.mock.calls.filter(([url]) =>
    String(url).endsWith("/accounts/me"),
  ).length;

  // When
  accountUnavailable = true;
  await act(async () => listeners.forEach((listener) => listener("active")));
  await act(async () => jest.advanceTimersByTimeAsync(8_000));

  // Then
  expect(screen.getByText(`Match destination ${matchId}`)).toBeOnTheScreen();
  expect(screen).toHavePathname(`/matches/${matchId}`);
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).endsWith("/accounts/me"))
      .length,
  ).toBeGreaterThan(accountReadsBefore);
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("keeps public Match navigation open after an HTTP 401 account refusal without SDK reauthentication", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? new Response(null, { status: 401 })
      : json(applicationAccessResponse()),
  );
  const matchId = "00000000-0000-4000-8000-000000000745";

  // When
  await openRoute(`/matches/${matchId}`, SignInRoute);

  // Then
  expect(
    await screen.findByText(`Match destination ${matchId}`),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Se connecter" }),
  ).not.toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method !== "POST"),
  ).toBe(true);
});

it("keeps a public Match open after canonical account absence without implicit establishment", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? json(
          {
            type: "urn:blockout:problem:not-found",
            title: "Not found",
            status: 404,
          },
          404,
        )
      : json(applicationAccessResponse()),
  );
  const matchId = "00000000-0000-4000-8000-000000000745";

  // When
  await openRoute(`/matches/${matchId}`, SignInRoute);

  // Then
  expect(
    await screen.findByText(`Match destination ${matchId}`),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method !== "POST"),
  ).toBe(true);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});

it("keeps public consultation available when native SDK evidence requires explicit reconnection", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockRejectedValue({
    code: CredentialsManagerErrorCodes.NO_REFRESH_TOKEN,
    message: "Credentials unavailable",
  });
  mockFetch.mockResolvedValue(json(applicationAccessResponse()));
  const matchId = "00000000-0000-4000-8000-000000000745";

  // When
  await openRoute(`/matches/${matchId}`, SignInRoute);

  // Then
  expect(
    await screen.findByText(`Match destination ${matchId}`),
  ).toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).endsWith("/accounts/me")),
  ).toBe(false);
});

it.each([200, 503])(
  "returns to the exact destination only after successful establishment HTTP %s",
  async (establishmentStatus) => {
    // Given: real Login, stable session mutation and Router cross the native subject remount.
    const credentials = credentialsFor("auth0|operator180");
    mockAuth0.webAuth.mockResolvedValue(credentials);
    mockAuth0.getCredentials.mockResolvedValue(credentials);
    mockFetch.mockImplementation(async (url, request) => {
      if (request?.method === "POST") {
        return establishmentStatus === 200
          ? json(operator)
          : new Response(null, { status: establishmentStatus });
      }
      return json(
        String(url).endsWith("/accounts/me")
          ? operator
          : applicationAccessResponse(),
      );
    });
    const matchId = "00000000-0000-4000-8000-000000000745";
    const destination = `/matches/${matchId}?source=notification&view=one&view=two#links`;
    const user = userEvent.setup();
    await openRoute(
      `/sign-in?returnTo=${encodeURIComponent(destination)}`,
      SignInRoute,
    );

    // When
    await user.press(
      await screen.findByRole("button", { name: "Se connecter", busy: false }),
    );

    // Then
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.filter(
          ([, request]) => request?.method === "POST",
        ),
      ).toHaveLength(1),
    );
    if (establishmentStatus === 200) {
      expect(
        await screen.findByText(`Match destination ${matchId}`),
      ).toBeOnTheScreen();
      expect(screen).toHavePathnameWithParams(destination);
    } else {
      expect(
        await screen.findByRole("alert", { name: "Une erreur est survenue." }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Se connecter", busy: false }),
      ).toBeEnabled();
      expect(
        screen.queryByRole("button", { name: "Réessayer" }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText(`Match destination ${matchId}`),
      ).not.toBeOnTheScreen();
      expect(screen).toHavePathname("/sign-in");
      expect(screen).toHaveSearchParams({ returnTo: destination });
    }
    expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  },
);

it("allows explicit retry after native cold-check recovery is exhausted", async () => {
  // Given
  mockFetch.mockRejectedValue(new Error("Offline"));
  const user = userEvent.setup();
  await openRoute("/support", SignInRoute);
  await screen.findByRole("alert", {
    name: "Une erreur est survenue",
  });

  // When
  const retry = Promise.withResolvers<Response>();
  mockFetch.mockReturnValue(retry.promise);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(screen.getByRole("alert")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeBusy();
  expect(screen.queryByText("Ordinary home")).toBeNull();

  // When
  await act(async () => retry.resolve(json(applicationAccessResponse())));

  // Then
  expect(
    await screen.findByRole("button", { name: "Se connecter" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/application-access"),
    ),
  ).toHaveLength(5);
});

it("a bypass-only account makes its explicit personal choice before ordinary access", async () => {
  // Given
  const full = applicationAccessResponse();
  full.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async (url) =>
    json(
      String(url).endsWith("/accounts/me")
        ? { ...operator, permissions: { bypassMaintenance: true } }
        : full,
    ),
  );
  const user = userEvent.setup();
  await openRoute("/");
  expect(
    await screen.findByRole("header", { name: "Blockout est en maintenance" }),
  ).toBeOnTheScreen();

  // When
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(
    await screen.findByRole("button", {
      name: "Accéder à l’application pendant la maintenance",
    }),
  );

  // Then
  expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/application-access"),
    ),
  ).toHaveLength(1);
});

it("keeps an unknown direct route behind the gate", async () => {
  // Given
  mockFetch.mockRejectedValue(new Error("Unavailable"));

  // When
  await openRoute("/unknown-private-link");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue",
    }),
  ).toBeOnTheScreen();
});

it("keeps the framework sitemap behind ordinary admission", async () => {
  // Given
  mockFetch.mockRejectedValue(new Error("Unavailable"));

  // When
  await openRoute("/_sitemap");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue",
    }),
  ).toBeOnTheScreen();
});

/** Drives the real F05 hosted-return boundary; native browser I/O remains controlled. */
function SignInProbe() {
  const session = useAccountSession();
  return (
    <>
      <Text>Sign-in route</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Connect existing account"
        onPress={() =>
          session.connection.mutate({
            audience: "test-audience",
            signIn: session.signIn,
          })
        }
      >
        <Text>Connect existing account</Text>
      </Pressable>
    </>
  );
}

it("keeps the public access check independent of explicit connection", async () => {
  // Given
  mockAuth0.webAuth
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator180"));
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockFetch.mockImplementation(async (url, request) =>
    json(
      String(url).endsWith("/accounts/me") || request?.method === "POST"
        ? operator
        : applicationAccessResponse(),
    ),
  );
  const user = userEvent.setup();
  await openRoute("/sign-in");

  // When
  await user.press(
    await screen.findByRole("button", { name: "Connect existing account" }),
  );

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).endsWith("/accounts/me"),
      ),
    ).toBe(true),
  );
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/application-access"),
    ),
  ).toHaveLength(1);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("retries failed Auth0 restoration without clearing credentials or starting interactive sign-in", async () => {
  // Given
  const full = applicationAccessResponse();
  full.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockRejectedValueOnce(new Error("Temporary SDK restoration failure"))
    .mockResolvedValue(credentialsFor("auth0|operator180"));
  mockFetch.mockImplementation(async (url) =>
    json(String(url).endsWith("/accounts/me") ? operator : full),
  );
  await openRoute("/");
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  expect(
    screen.queryByRole("link", { name: "Accès administrateur" }),
  ).toBeNull();

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  ).toBeOnTheScreen();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/application-access"),
    ),
  ).toHaveLength(2);
});

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
      onboarding: OnboardingRoute,
      "age-declaration": () => <Text>Age declaration</Text>,
      "(ordinary)/_layout": OrdinaryLayout,
      "(recovery)/_layout": RecoveryLayout,
      "(ordinary)/(tabs)/_layout": () => <Stack />,
      "(operations)/_layout": OperationsLayout,
      access: AccessGateScreen,
      "+not-found": NotFoundRoute,
      "(ordinary)/(tabs)/index": () => <Text>Ordinary home</Text>,
      "(ordinary)/matches/[matchId]": MatchProbe,
      "(ordinary)/privacy": () => null,
      "(ordinary)/privacy-age": () => null,
      "(ordinary)/pro": () => null,
      "(ordinary)/sign-in-invitation": () => null,
      "(recovery)/support/_layout": SupportLayout,
      "(recovery)/support/index": SupportRoute,
      "(recovery)/support/choice": SupportChoiceRoute,
      "(ordinary)/legal": () => <Text>Legal route</Text>,
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
    expect(
      screen.getByRole("progressbar", { name: "Vérification de l’accès" }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
    expect(screen.queryByText("Illustration à définir")).toBeNull();
  } finally {
    // Cleanup: release initialization only after consumers have unmounted.
    await cleanup();
    await act(async () => initialization.resolve());
  }
});

it.each(["/support", "/legal", "/sign-in", "/administration"])(
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
      screen.queryByRole("alert", {
        name: "Impossible de charger votre compte",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Continuer en tant qu’invité" }),
    ).toBeNull();
  },
);

it("uses a fresh complete read on native focus and reconnect", async () => {
  // Given
  const full = applicationAccessResponse();
  mockFetch.mockImplementation(async () => Response.json(full));
  await openRoute("/");
  await screen.findByText("Ordinary home");
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
  expect(
    await screen.findByRole("header", { name: "Blockout est en maintenance" }),
  ).toBeOnTheScreen();
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
  "keeps member recovery and legal/support/sign-in routes behind the %s gate",
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
      router.push("/legal");
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
      screen.queryByRole("alert", {
        name: "Impossible de charger votre compte",
      }),
    ).toBeNull();
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

it("withholds initial member entry and preserves a direct Match through help and read recovery", async () => {
  // Given: real admission and support routes; the unrelated Match body only exposes its UUID.
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const firstRead = Promise.withResolvers<Response>();
  let accountRead = firstRead.promise;
  mockFetch.mockImplementation(async (url) => {
    if (String(url).endsWith("/accounts/me")) {
      return accountRead;
    }
    return json(applicationAccessResponse());
  });
  const user = userEvent.setup();
  const matchId = "00000000-0000-4000-8000-000000000745";

  // When
  await openRoute(`/matches/${matchId}`);

  // Then: loading never presents a ready ordinary page or an active guest-departure command.
  expect(screen.queryByText(`Match destination ${matchId}`)).toBeNull();
  expect(screen.queryByText("Ordinary home")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Continuer en tant qu’invité" }),
  ).toBeNull();

  // When
  await act(async () => firstRead.resolve(new Response(null, { status: 503 })));
  await act(async () => jest.advanceTimersByTimeAsync(8_000));

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Impossible de charger votre compte",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByText("Réessayez ou continuez en invité."),
  ).toBeOnTheScreen();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByRole("link", { name: "Besoin d’aide ?" }));

  // Then
  expect(
    await screen.findByRole("header", { name: "Assistance et suggestions" }),
  ).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await screen.findByRole("alert", {
    name: "Impossible de charger votre compte",
  });
  accountRead = Promise.resolve(json(operator));
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByText(`Match destination ${matchId}`),
  ).toBeOnTheScreen();
  expect(screen).toHavePathname(`/matches/${matchId}`);
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/application-access"),
    ),
  ).toHaveLength(1);
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method !== "POST"),
  ).toBe(true);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("continues as guest only after explicit successful local credential clearing", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.clearCredentials
    .mockRejectedValueOnce(new Error("Native clear failed"))
    .mockImplementation(async () => {
      mockAuth0.hasValidCredentials.mockResolvedValue(false);
    });
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? new Response(null, { status: 503 })
      : json(applicationAccessResponse()),
  );
  const user = userEvent.setup();
  await openRoute("/");
  await screen.findByRole("alert", {
    name: "Impossible de charger votre compte",
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
  );

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Impossible de charger votre compte",
    }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Ordinary home")).toBeNull();
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
    ).toBeEnabled(),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
  );

  // Then
  expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(2);
  expect(mockAuth0.webAuthLogout).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
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
  expect(
    screen.queryByRole("alert", { name: "Impossible de charger votre compte" }),
  ).toBeNull();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("retries an HTTP 401 account read without interpreting it as SDK reauthentication", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  let accountUnauthorized = true;
  mockFetch.mockImplementation(async (url) => {
    if (String(url).endsWith("/accounts/me")) {
      if (accountUnauthorized) {
        return new Response(null, { status: 401 });
      }
      return json(operator);
    }
    return json(applicationAccessResponse());
  });
  const user = userEvent.setup();
  await openRoute("/");

  // Then
  expect(
    await screen.findByText("Réessayez ou continuez en invité."),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Se connecter" })).toBeNull();

  // When
  accountUnauthorized = false;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method !== "POST"),
  ).toBe(true);
});

it("establishes a missing account only from its explicit creation action", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  let established = false;
  mockFetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith("/accounts") && options?.method === "POST") {
      established = true;
      return json(operator, 201);
    }
    if (String(url).endsWith("/accounts/me")) {
      return established
        ? json(operator)
        : json(
            {
              type: "urn:blockout:problem:not-found",
              title: "Not found",
              status: 404,
            },
            404,
          );
    }
    return json(applicationAccessResponse());
  });
  const user = userEvent.setup();
  await openRoute("/");

  // Then
  expect(
    await screen.findByText("Créez votre compte ou continuez en invité."),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method !== "POST"),
  ).toBe(true);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByRole("button", { name: "Créer mon compte" }));

  // Then
  expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("offers sign-in only after native SDK evidence requires reauthentication", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockRejectedValue({
    code: CredentialsManagerErrorCodes.NO_REFRESH_TOKEN,
    message: "Credentials unavailable",
  });
  mockFetch.mockResolvedValue(json(applicationAccessResponse()));

  // When
  await openRoute("/");

  // Then
  expect(
    await screen.findByText("Connectez-vous ou continuez en invité."),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Se connecter" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Ordinary home")).toBeNull();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).endsWith("/accounts/me")),
  ).toBe(false);
});

it.each([200, 503])(
  "resumes the exact direct destination after explicit SDK recovery and establishment HTTP %s",
  async (establishmentStatus) => {
    // Given: the real sign-in route crosses the native subject lifetime; only SDK I/O and HTTP are controlled.
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    mockAuth0.getCredentials.mockRejectedValue({
      code: CredentialsManagerErrorCodes.NO_REFRESH_TOKEN,
      message: "Credentials unavailable",
    });
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
    await openRoute(destination, SignInRoute);

    // When
    await user.press(
      await screen.findByRole("button", { name: "Se connecter" }),
    );

    // Then
    await screen.findByText(/Les calendriers, les résultats disponibles/);
    expect(screen).toHavePathname("/sign-in");
    expect(screen).toHaveSearchParams({ returnTo: destination });
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();

    // Given: explicit native recovery returns the original account principal.
    const credentials = credentialsFor("auth0|operator180");
    mockAuth0.webAuth.mockResolvedValue(credentials);
    mockAuth0.saveCredentials.mockResolvedValue();
    mockAuth0.getCredentials.mockResolvedValue(credentials);

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
    expect(
      await screen.findByText(`Match destination ${matchId}`),
    ).toBeOnTheScreen();
    expect(screen).toHavePathnameWithParams(destination);
    expect(
      mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
    ).toHaveLength(1);
    expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  },
);

it("allows explicit retry after native cold-check recovery is exhausted", async () => {
  // Given
  mockFetch.mockRejectedValue(new Error("Offline"));
  const user = userEvent.setup();
  await openRoute("/support");
  await screen.findByRole("alert", {
    name: "Une erreur est survenue",
  });

  // When
  mockFetch.mockResolvedValue(json(applicationAccessResponse()));
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
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
        onPress={() => void session.signIn("test-audience")}
      >
        <Text>Connect existing account</Text>
      </Pressable>
    </>
  );
}

it("refreshes only the existing account on authentication return", async () => {
  // Given
  mockAuth0.webAuth
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator180"));
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockFetch.mockImplementation(async (url) =>
    json(
      String(url).endsWith("/accounts/me")
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
    mockFetch.mock.calls.every(([, options]) => options?.method === "GET"),
  ).toBe(true);
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

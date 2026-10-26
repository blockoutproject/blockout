import { focusManager, onlineManager } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  userEvent,
} from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text, Pressable } from "react-native";
import type { ComponentType } from "react";
import { AccessGateScreen } from "../screens/access-gate-screen";
import NotFoundRoute from "../../../app/+not-found";
import OperationsLayout from "../../../app/(operations)/_layout";
import AdministrationRoute from "../../../app/(operations)/administration";
import RootLayout from "../../../app/_layout";
import OnboardingRoute from "../../../app/onboarding";
import { completeDiscovery } from "../../onboarding/discovery-state";
import { useAccountSession } from "../../accounts/current-account";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";

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
  await completeDiscovery();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator180"));
  mockAuth0.webAuth.mockReset();
  mockFetch.mockReset();
});
afterEach(() => {
  process.env = { ...environment };
});

/** Mounts the production root around route probes; Expo owns deep-link fallback and history. */
async function openRoute(path: string) {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      onboarding: OnboardingRoute,
      "(ordinary)/_layout": () => <Stack />,
      "(operations)/_layout": OperationsLayout,
      access: AccessGateScreen,
      "+not-found": NotFoundRoute,
      "(ordinary)/index": () => <Text>Ordinary home</Text>,
      "(ordinary)/support": () => <Text>Support route</Text>,
      "(ordinary)/legal": () => <Text>Legal route</Text>,
      "(ordinary)/sign-in": SignInProbe,
      "(operations)/administration/index": AdministrationRoute,
      "(operations)/administration/maintenance": () => (
        <Text>Maintenance editor</Text>
      ),
    },
    { initialUrl: path },
  );
}

it("starts the public request while F14 initialization has not completed", async () => {
  // Given
  jest.mocked(initializeV2Installation).mockReturnValue(new Promise(() => {}));
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(applicationAccessResponse()), {
      headers: { "Content-Type": "application/json" },
    }),
  );

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
    screen.getByRole("progressbar", { name: "Chargement en cours" }),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
  expect(screen.queryByText("Illustration à définir")).toBeNull();
});

it.each(["/support", "/legal", "/sign-in", "/administration"])(
  "refuses the direct route %s after an unavailable public check",
  async (path) => {
    // Given
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
    expect(screen.queryByText("Illustration à définir")).toBeNull();
    expect(
      screen.queryByText(/^(Support|Legal|Sign-in|Operational) route$/),
    ).toBeNull();
  },
);

it("does not rerun a complete check on foreground or reconnect", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(applicationAccessResponse()), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await openRoute("/");
  await screen.findByText("Ordinary home");

  // When
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
  });

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

/** Complete canonical Fetch response; errors remain real transport errors. */
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type":
        status === 200 ? "application/json" : "application/problem+json",
    },
  });
}

const operator = {
  accountId: "00000000-0000-4000-8000-000000000180",
  username: "Operator_180",
  email: "operator@example.invalid",
  hasPhoto: false,
  principalCreatedAt: null,
  permissions: { manageMaintenance: true },
};

it.each(["maintenance", "update"] as const)(
  "keeps legal/support/sign-in routes and back behind the %s gate",
  async (restriction) => {
    // Given
    const full = applicationAccessResponse();
    if (restriction === "maintenance")
      full.maintenance = {
        revision: 1,
        active: true,
        message: "Nous intervenons sur le service.",
        imageUrl: null,
      };
    else
      full.versions.ios = {
        minimumVersion: "2.10.0",
        storeUrl: "https://apps.apple.com/app/id123",
      };
    mockFetch.mockImplementation(async () => json(full));
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
    expect(
      screen.queryByRole("link", { name: "Accès administrateur" }),
    ).toBeNull();
    expect(screen.queryByText(/Aide|Assistance|Se connecter/)).toBeNull();
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
      if (identificationFails) throw new Error("Transient identity outage");
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

it("keeps ordinary public admission independent of an account 503", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? json(
          {
            type: "urn:blockout:problem:unavailable",
            title: "Unavailable",
            status: 503,
            detail: "Unavailable",
          },
          503,
        )
      : json(applicationAccessResponse()),
  );

  // When
  await openRoute("/");

  // Then
  expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
});

it("recovers from an unavailable cold check only through an explicit successful retry", async () => {
  // Given
  mockFetch
    .mockRejectedValueOnce(new Error("Offline"))
    .mockImplementation(async () => json(applicationAccessResponse()));
  const user = userEvent.setup();
  await openRoute("/support");
  await screen.findByRole("alert", {
    name: "Une erreur est survenue",
  });

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Ordinary home")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/application-access"),
    ),
  ).toHaveLength(2);
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

import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { focusManager } from "@tanstack/react-query";
import { act, screen, userEvent } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType } from "react";
import { Linking, Pressable, Text } from "react-native";
import RootLayout from "../../../app/_layout";
import OnboardingRoute from "../../../app/onboarding";
import SignInRoute from "../../../app/(ordinary)/sign-in";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { useAccountSession } from "../../accounts/current-account";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import Purchases from "react-native-purchases";
import { initializeV2Installation } from "../initialize-v2-installation";
import { readDiscoveryCompletion } from "../discovery-state";
import { AccessGateScreen } from "../../access/screens/access-gate-screen";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("../initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    ...jest.requireActual("../../pro/test-support/native-purchases")
      .mockPurchases,
    restorePurchases: jest.fn(),
  },
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

beforeEach(async () => {
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  await AsyncStorage.clear();
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|discovery"));
  mockAuth0.webAuth.mockReset();
  mockFetch
    .mockReset()
    .mockImplementation(async () => Response.json(applicationAccessResponse()));
});
afterEach(() => {
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Real root/session/admission/discovery; the SDK and HTTP are controlled, ordinary routes are probes. */
async function openInstallation(initialUrl = "/", SignIn = OrdinarySession) {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      onboarding: OnboardingRoute,
      access: AccessGateScreen,
      "(ordinary)/_layout": () => <Stack />,
      "(ordinary)/index": () => <Text>Ordinary home</Text>,
      "(ordinary)/sign-in": () => <SignIn />,
      "(ordinary)/legal": () => <Text>Legal route</Text>,
      "(ordinary)/support": () => <Text>Support route</Text>,
      "(operations)/_layout": () => <Stack />,
      "(operations)/administration/index": () => <Text>Operations route</Text>,
    },
    { initialUrl },
  );
}

/** Observes current F05 state and exercises its actual local sign-out boundary. */
function OrdinarySession() {
  const session = useAccountSession();
  return (
    <>
      <Text>Ordinary sign-in: {session.status}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Sign out</Text>
      </Pressable>
    </>
  );
}

it("presents common discovery before ordinary access, then keeps sign-out and foreground independent", async () => {
  // Given
  const user = userEvent.setup();
  await openInstallation();
  expect(
    await screen.findByRole("button", { name: "Passer" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Ordinary home")).toBeNull();

  // When
  await user.press(screen.getByRole("button", { name: "Passer" }));
  await user.press(await screen.findByRole("button", { name: "Sign out" }));
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });

  // Then
  expect(await screen.findByText("Ordinary sign-in: guest")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
  expect(await readDiscoveryCompletion()).toBe(true);
});

it.each([
  ["cancelled", "Connexion annulée."],
  ["failed", TECHNICAL_ERROR],
  ["profile unavailable", TECHNICAL_ERROR],
])(
  "keeps completed discovery and ordinary guest/support access after %s sign-in",
  async (outcome, message) => {
    // Given
    const user = userEvent.setup();
    if (outcome === "profile unavailable") {
      mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|discovery"));
      mockFetch.mockImplementation(async (url) =>
        String(url).endsWith("/application-access")
          ? Response.json(applicationAccessResponse())
          : Response.json(
              {
                type: "urn:blockout:problem:internal-error",
                title: "Unavailable",
                status: 500,
              },
              { status: 500 },
            ),
      );
    } else {
      mockAuth0.webAuth.mockRejectedValue({
        code:
          outcome === "cancelled"
            ? "a0.session.user_cancelled"
            : "a0.network_error",
        message: "Controlled native failure",
      });
    }
    await openInstallation("/", SignInRoute);
    await user.press(await screen.findByRole("button", { name: "Passer" }));

    // When
    await user.press(
      await screen.findByRole("button", { name: "Se connecter" }),
    );

    // Then
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "Besoin d’aide ?" }),
    ).toBeOnTheScreen();
    expect(Purchases.restorePurchases).not.toHaveBeenCalled();
    expect(await readDiscoveryCompletion()).toBe(true);
  },
);

it.each(["/onboarding", "/sign-in", "/legal", "/support"])(
  "keeps %s behind current F12 blocking",
  async (path) => {
    // Given
    mockFetch.mockRejectedValue(new Error("Unavailable"));

    // When
    await openInstallation(path);

    // Then
    expect(
      await screen.findByText(
        "L’accès à l’application n’a pas pu être vérifié.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
    expect(
      screen.queryByText(/Ordinary sign-in|Legal route|Support route/),
    ).toBeNull();
    expect(await readDiscoveryCompletion()).toBe(false);
  },
);

it("preserves a completed installation’s deep link while its local flag is being read", async () => {
  // Given
  const read = Promise.withResolvers<string | null>();
  jest.spyOn(AsyncStorage, "getItem").mockReturnValueOnce(read.promise);
  await openInstallation("/support");
  expect(screen.queryByText("Support route")).toBeNull();

  // When
  await act(async () => read.resolve("true"));

  // Then
  expect(await screen.findByText("Support route")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
});

it("keeps the root loading gate during an explicit installation-read retry", async () => {
  // Given
  const read = Promise.withResolvers<string | null>();
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockRejectedValueOnce(new Error("Storage"))
    .mockReturnValueOnce(read.promise);
  const user = userEvent.setup();
  await openInstallation();
  expect(
    await screen.findByText("La découverte n’a pas pu être chargée."),
  ).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    screen.getByRole("progressbar", { name: "Chargement en cours" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();

  // When
  await act(async () => read.resolve(null));

  // Then
  expect(
    await screen.findByRole("button", { name: "Passer" }),
  ).toBeOnTheScreen();
});

it.each(["maintenance", "minimum version"])(
  "suppresses discovery under %s",
  async (gate) => {
    // Given
    const access = applicationAccessResponse();
    if (gate === "maintenance") access.maintenance.active = true;
    else {
      access.versions.ios.minimumVersion = "9.0.0";
      access.versions.android.minimumVersion = "9.0.0";
    }
    mockFetch.mockImplementation(async () => Response.json(access));

    // When
    await openInstallation("/onboarding");

    // Then
    expect(
      await screen.findByRole("header", {
        name:
          gate === "maintenance"
            ? "Blockout est en maintenance"
            : "Mets Blockout à jour.",
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
    expect(await readDiscoveryCompletion()).toBe(false);
  },
);

it("leaves completed discovery unchanged after restart and a later V2 release", async () => {
  // Given
  const user = userEvent.setup();
  const view = await openInstallation();
  await user.press(await screen.findByRole("button", { name: "Passer" }));
  await view.unmount();

  // When
  jest.replaceProperty(Application, "nativeApplicationVersion", "3.0.0");
  await openInstallation("/support");

  // Then
  expect(await screen.findByText("Support route")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
  expect(await readDiscoveryCompletion()).toBe(true);
});

it("keeps the public store action and its error available while installation initialization is pending", async () => {
  // Given
  const initialization = Promise.withResolvers<void>();
  jest
    .mocked(initializeV2Installation)
    .mockReturnValueOnce(initialization.promise);
  const access = applicationAccessResponse();
  access.versions.ios = {
    minimumVersion: "3.0.0",
    storeUrl: "https://apps.apple.com/app/id123456789",
  };
  access.versions.android = {
    minimumVersion: "3.0.0",
    storeUrl: "https://play.google.com/store/apps/details?id=app.blockout",
  };
  mockFetch.mockResolvedValue(Response.json(access));
  jest
    .spyOn(Linking, "openURL")
    .mockRejectedValue(new Error("Store unavailable"));
  const user = userEvent.setup();
  await openInstallation();

  // When
  await user.press(
    await screen.findByRole("button", { name: "Mettre à jour l’application" }),
  );

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
  expect(mockAuth0.hasValidCredentials).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeEnabled();
  await act(() => initialization.resolve());
});

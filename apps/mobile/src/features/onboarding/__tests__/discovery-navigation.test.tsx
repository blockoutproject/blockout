import AgeDeclarationRoute from "@/app/age-declaration";
import { ProfileScreen } from "@/features/accounts/screens/profile-screen";
import { TECHNICAL_ERROR } from "@/shared/components/error-copy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { focusManager } from "@tanstack/react-query";
import { act, cleanup, screen, userEvent } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType } from "react";
import { Linking, Pressable, Text } from "react-native";
import RootLayout from "@/app/_layout";
import EntryRoute from "@/app/index";
import OnboardingRoute from "@/app/onboarding";
import RecoveryLayout from "@/app/(recovery)/_layout";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { useAccountSession } from "@/features/accounts/current-account";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { initializeV2Installation } from "../initialize-v2-installation";
import { readDiscoveryCompletion } from "../discovery-state";
import { AccessGateScreen } from "@/features/access/screens/access-gate-screen";

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
    ...jest.requireActual("@/features/pro/test-support/native-purchases")
      .mockPurchases,
    restorePurchases: jest.fn(),
  },
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
afterEach(async () => {
  await cleanup();
  focusManager.setFocused(undefined);
  process.env = { ...environment };
  jest.restoreAllMocks();
  jest.useRealTimers();
});

/** Real root/public admission/session/discovery; unrelated business destinations remain route probes. */
async function openInstallation(initialUrl = "/", SignIn = OrdinarySession) {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      index: EntryRoute,
      onboarding: OnboardingRoute,
      access: AccessGateScreen,
      "age-declaration": AgeDeclarationRoute,
      "(ordinary)/_layout": () => <Stack />,
      "(recovery)/_layout": RecoveryLayout,
      "(ordinary)/(tabs)/(home)/(personal)/index": () => (
        <Text>Ordinary home</Text>
      ),
      "(ordinary)/profile": () => (
        <ProfileScreen admitted proEntry={null} privacyEntry={null} />
      ),
      "(recovery)/sign-in": () => <SignIn />,
      "(ordinary)/legal": () => <Text>Legal route</Text>,
      "(recovery)/support": () => <Text>Support route</Text>,
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

it("opens ordinary entry after a failed discovery read and write, with discovery again on relaunch", async () => {
  // Given
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockRejectedValueOnce(new Error("Storage"));
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("Storage"));
  const user = userEvent.setup();
  const view = await openInstallation();

  // When
  await user.press(await screen.findByRole("button", { name: "Passer" }));

  // Then
  expect(await screen.findByText("Ordinary sign-in: guest")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
  expect(await readDiscoveryCompletion()).toBe(false);

  // When
  await view.unmount();
  await openInstallation();

  // Then
  expect(
    await screen.findByRole("button", { name: "Passer" }),
  ).toBeOnTheScreen();
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

  // When
  await act(() => initialization.resolve());

  // Then
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeEnabled();
});

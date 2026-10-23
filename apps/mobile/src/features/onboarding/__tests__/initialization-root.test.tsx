import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Stack } from "expo-router";
import type { ComponentType } from "react";
import { Pressable, Text } from "react-native";
import { useAuth0 } from "react-native-auth0";
import RootLayout from "../../../app/_layout";
import { useAccountSession } from "../../accounts/session/account-session-provider";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
}));

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: jest.fn(),
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
// Keep the initializer and SDK React integration real; control only native I/O.
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});

const marker = "blockout:v2-initialized";
const originalConfiguration = {
  EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
};

beforeEach(async () => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  await AsyncStorage.clear();
  mockAuth0.hasValidAuth0InstanceWithConfiguration
    .mockReset()
    .mockResolvedValue(true);
  mockAuth0.initializeAuth0WithConfiguration.mockClear();
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials.mockReset();
  jest.mocked(Stack).mockImplementation(InitializationConsumer);
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const [key, value] of Object.entries(originalConfiguration)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** Replaces route content while retaining the real root, theme, Query and session providers. */
function InitializationConsumer() {
  const session = useAccountSession();
  const auth = useAuth0();
  return (
    <>
      <Text>Public content</Text>
      <Text>Authentication: {session.status}</Text>
      <Text>Identity: {auth.user?.sub ?? "guest"}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry initialization"
        onPress={session.retryInitialization}
      >
        <Text>Retry</Text>
      </Pressable>
    </>
  );
}

it.each(["native clearing", "marker persistence"] as const)(
  "waits for %s before admitting routes and SDK restoration",
  async (pendingStep) => {
    // Given
    mockAuth0.hasValidAuth0InstanceWithConfiguration.mockResolvedValue(false);
    const completion = Promise.withResolvers<void>();
    if (pendingStep === "native clearing") {
      mockAuth0.clearCredentials.mockReturnValueOnce(completion.promise);
    } else {
      const write = AsyncStorage.setItem;
      jest
        .spyOn(AsyncStorage, "setItem")
        .mockImplementationOnce(async (key, value) => {
          await completion.promise;
          await write(key, value);
        });
    }

    // When
    await render(<RootLayout />);

    // Then
    expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Public content")).not.toBeOnTheScreen();
    expect(mockAuth0.hasValidCredentials).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(marker)).toBeNull();

    // When
    await act(async () => completion.resolve());

    // Then
    expect(screen.getByText("Public content")).toBeOnTheScreen();
    expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
    expect(mockAuth0.hasValidCredentials).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(marker)).toBe("true");
    expect(mockAuth0.initializeAuth0WithConfiguration).toHaveBeenCalled();
    for (const configuration of mockAuth0.initializeAuth0WithConfiguration.mock
      .calls) {
      expect(configuration[3]).toBe(false);
    }
  },
);

it.each(["native clearing", "marker persistence"] as const)(
  "preserves guest access after rejected %s and initializes on explicit retry",
  async (failure) => {
    // Given
    const error = new Error("Storage unavailable");
    if (failure === "native clearing") {
      mockAuth0.clearCredentials.mockRejectedValueOnce(error);
    } else {
      jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(error);
    }
    const user = userEvent.setup();
    await render(<RootLayout />);
    expect(screen.getByText("Public content")).toBeOnTheScreen();
    expect(
      screen.getByText("Authentication: initialization-error"),
    ).toBeOnTheScreen();
    expect(mockAuth0.hasValidCredentials).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(marker)).toBeNull();

    // When
    await user.press(
      screen.getByRole("button", { name: "Retry initialization" }),
    );

    // Then
    expect(screen.getByText("Authentication: guest")).toBeOnTheScreen();
    expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(2);
    expect(mockAuth0.hasValidCredentials).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(marker)).toBe("true");
  },
);

it("restores the ordinary SDK identity on subsequent launches without clearing it again", async () => {
  // Given
  await AsyncStorage.setItem(marker, "true");
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|current"));
  const root = await render(<RootLayout />);
  expect(screen.getByText("Identity: auth0|current")).toBeOnTheScreen();

  // When
  await root.unmount();
  await render(<RootLayout />);

  // Then
  expect(screen.getByText("Authentication: authenticated")).toBeOnTheScreen();
  expect(screen.getByText("Identity: auth0|current")).toBeOnTheScreen();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(marker)).toBe("true");
});

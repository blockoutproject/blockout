import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { useState, type ComponentType } from "react";
import { Pressable, Text } from "react-native";
import RootLayout from "../../../app/_layout";
import { useAccountSession } from "../../../features/accounts/session/account-session-provider";
import { mockClient } from "../../../features/accounts/test-support/native-auth0";
import { getSessionQueryKey } from "../query-client";

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: jest.fn(),
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock(require.resolve("react-native-auth0/src/Auth0.ts"), () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));
jest.mock("react-native-auth0", () =>
  jest
    .requireActual("../../../features/accounts/test-support/native-auth0")
    .nativeAuth0Module(),
);
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const originalConfiguration = {
  EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
};
beforeEach(() => {
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  mockClient.credentialsManager.hasValidCredentials
    .mockReset()
    .mockResolvedValue(false);
  mockClient.credentialsManager.clearCredentials
    .mockReset()
    .mockResolvedValue();
  mockClient.webAuth.clearSession.mockReset().mockResolvedValue();
});
afterEach(async () => {
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  for (const [key, value] of Object.entries(originalConfiguration)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** Reads and changes shared cache through the actual root provider, without a business route. */
function CacheConsumer() {
  const client = useQueryClient();
  const session = useAccountSession();
  const [signedOut, setSignedOut] = useState(false);
  const { data } = useQuery({
    queryKey: ["root-cache-probe"],
    initialData: 3,
    queryFn: skipToken,
  });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Update cached count"
        onPress={() => {
          client.setQueryData(["root-cache-probe"], 4);
          client.setQueryData(
            getSessionQueryKey(session.generation, ["private-probe"]),
            "private",
          );
        }}
      >
        <Text>Count: {data}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={async () => {
          await session.signOut();
          setSignedOut(true);
        }}
      >
        <Text>Sign out</Text>
      </Pressable>
      <Text>
        Private probe cached:{" "}
        {client
          .getQueryCache()
          .getAll()
          .some(({ queryKey }) => queryKey.at(-1) === "private-probe")
          ? "yes"
          : "no"}
      </Text>
      {signedOut && <Text>Signed out locally</Text>}
    </>
  );
}

it("scopes the route cache to the lifetime of one root", async () => {
  // Given
  jest.mocked(Stack).mockImplementation(CacheConsumer);
  const user = userEvent.setup();
  const root = await render(<RootLayout />);
  expect(screen.getByText("Count: 3")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Update cached count" }));
  await root.rerender(<RootLayout />);

  // Then
  expect(screen.getByText("Count: 4")).toBeOnTheScreen();

  // When
  await root.unmount();
  await render(<RootLayout />);

  // Then
  expect(screen.getByText("Count: 3")).toBeOnTheScreen();
});

it("removes private cache at local invalidation even when remote logout fails", async () => {
  // Given: the root, session, Query and SDK React provider are real; native browser I/O rejects.
  jest.mocked(Stack).mockImplementation(CacheConsumer);
  mockClient.webAuth.clearSession.mockRejectedValue(
    new Error("Provider unavailable"),
  );
  const user = userEvent.setup();
  await render(<RootLayout />);
  await user.press(screen.getByRole("button", { name: "Update cached count" }));
  expect(screen.getByText("Private probe cached: yes")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Sign out" }));

  // Then
  expect(screen.getByText("Signed out locally")).toBeOnTheScreen();
  expect(screen.getByText("Private probe cached: no")).toBeOnTheScreen();
  expect(screen.getByText("Count: 4")).toBeOnTheScreen();
});

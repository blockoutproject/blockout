import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { useState, type ComponentType, type PropsWithChildren } from "react";
import { Pressable, Text } from "react-native";
import { useAuth0 } from "react-native-auth0";
import RootLayout from "../../../app/_layout";
import { useAccountSession } from "../../../features/accounts/session/account-session-provider";
import { getSessionQueryKey } from "../query-client";

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: jest.fn(),
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("react-native-auth0", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    credentialsManager: {
      clearCredentials: jest.fn().mockResolvedValue(undefined),
      hasValidCredentials: jest.fn().mockResolvedValue(false),
    },
  })),
  Auth0Provider: ({ children }: PropsWithChildren) => children,
  useAuth0: () => ({
    user: null,
    isLoading: false,
    error: null,
    clearSession: mockRemoteLogout,
  }),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const mockRemoteLogout = jest.fn<Promise<void>, []>();
beforeEach(() => {
  jest.useFakeTimers();
  mockRemoteLogout.mockReset();
});
afterEach(async () => {
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
});

/** Reads and changes shared cache through the actual root provider, without a business route. */
function CacheConsumer() {
  const client = useQueryClient();
  const session = useAccountSession();
  const auth = useAuth0();
  const [logoutFailed, setLogoutFailed] = useState(false);
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
          session.invalidate();
          try {
            await auth.clearSession();
          } catch {
            setLogoutFailed(true);
          }
        }}
      >
        <Text>Sign out</Text>
      </Pressable>
      <Text>Cached queries: {client.getQueryCache().getAll().length}</Text>
      {logoutFailed && <Text>Remote logout failed</Text>}
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
  // Given: the root/session and Query are real; the SDK logout boundary rejects.
  jest.mocked(Stack).mockImplementation(CacheConsumer);
  mockRemoteLogout.mockRejectedValue(new Error("Provider unavailable"));
  const user = userEvent.setup();
  await render(<RootLayout />);
  await user.press(screen.getByRole("button", { name: "Update cached count" }));
  expect(screen.getByText("Cached queries: 2")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Sign out" }));

  // Then
  expect(screen.getByText("Remote logout failed")).toBeOnTheScreen();
  expect(screen.getByText("Cached queries: 1")).toBeOnTheScreen();
  expect(screen.getByText("Count: 4")).toBeOnTheScreen();
});

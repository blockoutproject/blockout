import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Stack } from "expo-router";
import { type ComponentType } from "react";
import { Pressable, Text } from "react-native";
import RootLayout from "../../../app/_layout";
import { mockAuth0 } from "../../../features/accounts/test-support/native-auth0";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual(
    "../../../features/pro/test-support/native-purchases",
  ).mockPurchases,
}));

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: jest.fn(),
  // This cache-owner suite replaces the navigator; native tap routing has its own real-router evidence.
  useRootNavigationState: () => ({ key: "synthetic-root" }),
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../../features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("expo/fetch", () => ({
  fetch: async () =>
    Response.json(
      jest
        .requireActual("../../api/test-support/application-access")
        .applicationAccessResponse(),
    ),
}));

const originalConfiguration = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
};
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
});
afterEach(async () => {
  await cleanup();
  for (const [key, value] of Object.entries(originalConfiguration)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** Reads and changes shared cache through the actual root provider, without a business route. */
function CacheConsumer() {
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: ["root-cache-probe"],
    initialData: 3,
    queryFn: skipToken,
    // This probe has no collection policy; avoid detached five-minute GC timers in Jest.
    gcTime: Infinity,
  });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Update cached count"
        onPress={() => {
          client.setQueryData(["root-cache-probe"], 4);
          client.setQueryData(["private-probe"], "private");
        }}
      >
        <Text>Count: {data}</Text>
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
    </>
  );
}

it("scopes the route cache to the lifetime of one root", async () => {
  // Given
  jest.mocked(Stack).mockImplementation(CacheConsumer);
  const user = userEvent.setup();
  const root = await render(<RootLayout />);
  expect(await screen.findByText("Count: 3")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Update cached count" }));
  await root.rerender(<RootLayout />);

  // Then
  expect(screen.getByText("Count: 4")).toBeOnTheScreen();

  // When
  await root.unmount();
  await render(<RootLayout />);

  // Then
  expect(await screen.findByText("Count: 3")).toBeOnTheScreen();
});

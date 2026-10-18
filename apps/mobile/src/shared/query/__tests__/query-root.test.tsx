import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Stack } from "expo-router";
import type { ComponentType } from "react";
import { Pressable, Text } from "react-native";
import RootLayout from "../../../app/_layout";

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: jest.fn(),
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component: ComponentType) => component,
}));

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
});

/** Reads and changes shared cache through the actual root provider, without a business route. */
function CacheConsumer() {
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: ["root-cache-probe"],
    initialData: 3,
    queryFn: skipToken,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Update cached count"
      onPress={() => client.setQueryData(["root-cache-probe"], 4)}
    >
      <Text>Count: {data}</Text>
    </Pressable>
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

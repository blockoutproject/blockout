import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { SplashScreen, Stack } from "expo-router";
import { renderRouter, testRouter } from "expo-router/testing-library";
import { Text, View } from "react-native";
import {
  NativeSplashHandoff,
  useNativeSplashLayout,
} from "../native-splash-handoff";

jest.mock("expo-router", () => {
  const actual = jest.requireActual("expo-router");
  return {
    ...actual,
    SplashScreen: { ...actual.SplashScreen, hide: jest.fn() },
  };
});

const fullLayout = {
  nativeEvent: { layout: { x: 0, y: 0, width: 393, height: 852 } },
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(SplashScreen.hide).mockClear();
});

afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
});

function Surface({ title }: Readonly<{ title: string }>) {
  return (
    <View testID="surface" onLayout={useNativeSplashLayout()}>
      <Text>{title}</Text>
    </View>
  );
}

it("waits for a laid-out deep-link anchor to become focused", async () => {
  // Given
  await renderRouter(
    {
      _layout: {
        unstable_settings: { anchor: "index" },
        default: () => (
          <NativeSplashHandoff>
            <Stack />
          </NativeSplashHandoff>
        ),
      },
      index: () => <Surface title="Overview" />,
      detail: () => <Text>Direct detail</Text>,
    },
    { initialUrl: "/detail" },
  );
  expect(screen.getByText("Direct detail")).toBeOnTheScreen();

  // When
  await fireEvent(
    screen.getByTestId("surface", { includeHiddenElements: true }),
    "layout",
    fullLayout,
  );
  await act(() => jest.advanceTimersToNextFrame());

  // Then
  expect(SplashScreen.hide).not.toHaveBeenCalled();

  // When
  await testRouter.back("/");

  // Then
  expect(screen.getByText("Overview")).toBeOnTheScreen();
  await waitFor(() => expect(SplashScreen.hide).toHaveBeenCalledTimes(1));
});

it("releases the splash for a visible fallback before navigation mounts", async () => {
  // Given
  await render(
    <NativeSplashHandoff>
      <Surface title="Maintenance" />
    </NativeSplashHandoff>,
  );

  // When
  await fireEvent(screen.getByTestId("surface"), "layout", fullLayout);

  // Then
  expect(screen.getByText("Maintenance")).toBeOnTheScreen();
  await waitFor(() => expect(SplashScreen.hide).toHaveBeenCalledTimes(1));
});

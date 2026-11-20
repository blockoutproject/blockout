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
import { useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import {
  NativeSplashHandoff,
  useNativeSplashLayout,
  useNativeSplashPending,
} from "../native-splash-handoff";
import { useStackScreenOptions } from "../stack-screen-options";

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
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function Surface({ title }: Readonly<{ title: string }>) {
  return (
    <View testID="surface" onLayout={useNativeSplashLayout()}>
      <Text>{title}</Text>
    </View>
  );
}

function PageTransition() {
  const splashPending = useNativeSplashPending();
  const { animation } = useStackScreenOptions(splashPending);
  return <Surface title={animation} />;
}

it.each([
  { reducedMotion: false, warmAnimation: "ios_from_right" },
  { reducedMotion: true, warmAnimation: "none" },
])(
  "applies the native motion setting after cold entry (reduced motion: $reducedMotion)",
  async ({ reducedMotion, warmAnimation }) => {
    // Given
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(reducedMotion);
    await render(
      <ThemeProvider>
        <NativeSplashHandoff>
          <PageTransition />
        </NativeSplashHandoff>
      </ThemeProvider>,
    );
    expect(screen.getByText("none")).toBeOnTheScreen();

    // When
    await fireEvent(screen.getByTestId("surface"), "layout", fullLayout);
    await act(() => jest.advanceTimersToNextFrame());

    // Then
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
    expect(screen.getByText(warmAnimation)).toBeOnTheScreen();
  },
);

/** Retains the initial screen option supplied to a stack at mount. */
function NewlyMountedStack() {
  const { animation } = useStackScreenOptions();
  const [initialAnimation] = useState(animation);
  return <Text>{initialAnimation}</Text>;
}

it.each([
  { reducedMotion: false, firstAnimation: "ios_from_right" },
  { reducedMotion: true, firstAnimation: "none" },
])(
  "uses $firstAnimation on the first render of a stack opened after motion resolves",
  async ({ reducedMotion, firstAnimation }) => {
    // Given
    const read = jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(reducedMotion);
    const view = await render(<ThemeProvider />);

    // When
    await view.rerender(
      <ThemeProvider>
        <NewlyMountedStack />
      </ThemeProvider>,
    );

    // Then
    expect(screen.getByText(firstAnimation)).toBeOnTheScreen();
    expect(read).toHaveBeenCalledTimes(1);
  },
);

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

import { cleanup, act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";
import { useReducedMotion as useStartupReducedMotion } from "react-native-reanimated";
import { ThemeProvider, useTheme } from "../theme-provider";

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  ...jest.requireActual("react-native-reanimated"),
  useReducedMotion: jest.fn(),
}));

function MotionPreference() {
  const { reducedMotion } = useTheme();
  return <Text>{reducedMotion ? "Static" : "Animated"}</Text>;
}

/** The Jest preset replaces the native event emitter. Use the actual subscription's handler. */
function motionListener(
  subscribe: jest.SpiedFunction<typeof AccessibilityInfo.addEventListener>,
) {
  return subscribe.mock.calls.find(
    ([event]) => event === "reduceMotionChanged",
  )?.[1];
}

beforeEach(() => jest.mocked(useStartupReducedMotion).mockReturnValue(true));

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

it.each([
  { startupReduced: true, first: "Static", current: "Animated" },
  { startupReduced: false, first: "Animated", current: "Static" },
])(
  "uses the $first startup preference until native values arrive",
  async ({ startupReduced, first, current }) => {
    // Given
    jest.mocked(useStartupReducedMotion).mockReturnValue(startupReduced);
    const initial = Promise.withResolvers<boolean>();
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockReturnValue(initial.promise);
    const subscribe = jest.spyOn(AccessibilityInfo, "addEventListener");

    // When
    await render(
      <ThemeProvider>
        <MotionPreference />
      </ThemeProvider>,
    );

    // Then
    expect(screen.getByText(first)).toBeOnTheScreen();

    // When
    await act(() => initial.resolve(!startupReduced));

    // Then
    expect(screen.getByText(current)).toBeOnTheScreen();

    // When
    await act(() => motionListener(subscribe)?.(startupReduced));

    // Then
    expect(screen.getByText(first)).toBeOnTheScreen();
  },
);

it("keeps a live native change when the initial preference read finishes late", async () => {
  // Given
  jest.mocked(useStartupReducedMotion).mockReturnValue(false);
  const initial = Promise.withResolvers<boolean>();
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockReturnValue(initial.promise);
  const subscribe = jest.spyOn(AccessibilityInfo, "addEventListener");
  await render(
    <ThemeProvider>
      <MotionPreference />
      <MotionPreference />
    </ThemeProvider>,
  );
  const changeMotion = motionListener(subscribe);

  // When
  await act(() => changeMotion?.(true));
  await act(async () => initial.resolve(false));

  // Then
  expect(screen.getAllByText("Static")).toHaveLength(2);

  // When
  await act(() => changeMotion?.(false));

  // Then
  expect(screen.getAllByText("Animated")).toHaveLength(2);
});

it("reads and listens once per mounted theme tree and releases its listener", async () => {
  // Given
  const initial = Promise.withResolvers<boolean>();
  const read = jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockReturnValue(initial.promise);
  const remove = jest.fn();
  const subscribe = jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockReturnValue({ remove });
  const view = await render(
    <ThemeProvider>
      <MotionPreference />
      <MotionPreference />
    </ThemeProvider>,
  );

  // When
  await view.unmount();
  await act(async () => initial.resolve(false));

  // Then
  expect(read).toHaveBeenCalledTimes(1);
  expect(
    subscribe.mock.calls.filter(([event]) => event === "reduceMotionChanged"),
  ).toHaveLength(1);
  expect(remove).toHaveBeenCalledTimes(1);
});

it("keeps the startup preference when the native read fails", async () => {
  // Given
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockRejectedValue(new Error("Native unavailable"));

  // When
  await render(
    <ThemeProvider>
      <MotionPreference />
    </ThemeProvider>,
  );

  // Then
  expect(screen.getByText("Static")).toBeOnTheScreen();
});

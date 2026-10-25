import { act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";
import { useReducedMotion } from "../use-reduced-motion";

/** Exposes the actual native preference bridge through a rendered consumer. */
function MotionPreference() {
  return <Text>{useReducedMotion() ? "Static" : "Animated"}</Text>;
}

afterEach(() => jest.restoreAllMocks());

it("keeps a live native change when the initial preference read finishes late", async () => {
  // Given
  const initial = Promise.withResolvers<boolean>();
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockReturnValue(initial.promise);
  // The preset replaces the native event emitter; drive the public native subscription boundary.
  const subscribe = jest.spyOn(AccessibilityInfo, "addEventListener");
  await render(<MotionPreference />);
  const changeMotion = subscribe.mock.calls.find(
    ([event]) => event === "reduceMotionChanged",
  )?.[1] as (enabled: boolean) => void;

  // When
  await act(async () => changeMotion(true));
  await act(async () => initial.resolve(false));

  // Then
  expect(screen.getByText("Static")).toBeOnTheScreen();

  // When
  await act(async () => changeMotion(false));

  // Then
  expect(screen.getByText("Animated")).toBeOnTheScreen();
});

it("does not publish an old read into a remounted consumer", async () => {
  // Given
  const previous = Promise.withResolvers<boolean>();
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockReturnValueOnce(previous.promise)
    .mockResolvedValueOnce(false);
  const view = await render(<MotionPreference />);

  // When
  await view.unmount();
  await render(<MotionPreference />);
  await act(async () => previous.resolve(true));

  // Then
  expect(screen.getByText("Animated")).toBeOnTheScreen();
});

it("keeps motion disabled when the native preference cannot be read", async () => {
  // Given
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockRejectedValue(new Error("Native unavailable"));

  // When
  await render(<MotionPreference />);

  // Then
  expect(screen.getByText("Static")).toBeOnTheScreen();
});

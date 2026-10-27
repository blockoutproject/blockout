import { cleanup, act, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";
import { useReducedMotion } from "../use-reduced-motion";

/** Exposes the actual native preference bridge through a rendered consumer. */
function MotionPreference() {
  return <Text>{useReducedMotion() ? "Static" : "Animated"}</Text>;
}

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

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
  )?.[1];
  if (!changeMotion) throw new Error("Missing native motion subscription");

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

it("releases the native subscription when its consumer unmounts", async () => {
  // Given
  const initial = Promise.withResolvers<boolean>();
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockReturnValue(initial.promise);
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({ remove });
  const view = await render(<MotionPreference />);

  // When
  await view.unmount();
  await act(async () => initial.resolve(false));

  // Then
  expect(remove).toHaveBeenCalledTimes(1);
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

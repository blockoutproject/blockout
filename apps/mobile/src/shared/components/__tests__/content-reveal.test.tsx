// Reanimated ships the native Jest matcher declarations separately from its web type entry.
import type {} from "react-native-reanimated/lib/typescript/jestUtils/index.native";
import { act, cleanup, render, screen } from "@testing-library/react-native";
import Animated from "react-native-reanimated";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { useSingleContentReveal } from "../content-reveal";

function Standings({ active }: Readonly<{ active: boolean }>) {
  const { motion } = useSingleContentReveal(active);
  return (
    <Animated.View accessible accessibilityLabel="Standings" style={motion} />
  );
}

afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
});

it("shows a retained block in its final position when its scene returns during the entrance", async () => {
  // Given
  jest.useFakeTimers();
  const view = await render(<Standings active />, { wrapper: ThemeProvider });
  await act(() => jest.advanceTimersByTime(64));
  const finalStyle = { opacity: 1, transform: [{ translateY: 0 }] };
  expect(screen.getByLabelText("Standings")).not.toHaveAnimatedStyle(
    finalStyle,
  );

  // When
  await view.rerender(<Standings active={false} />);
  await view.rerender(<Standings active />);
  await act(() => jest.advanceTimersByTime(16));

  // Then
  expect(screen.getByLabelText("Standings")).toHaveAnimatedStyle(finalStyle);
});

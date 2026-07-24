import React from "react";
import { render, userEvent } from "@testing-library/react-native";

import { Onboarding } from "@/src/modules/onboarding/ui/onboarding";
import type { OnboardingStep } from "@/src/modules/onboarding/model/steps";
import { ThemeProvider } from "@/src/shared/theme";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Success: "success" },
}));

jest.mock("expo-image", () => {
  const { View } = require("react-native") as typeof import("react-native");

  return { Image: View };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("react-native-worklets", () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
}));

jest.mock("react-native-reanimated", () => {
  const ReactModule = require("react") as typeof React;
  const ReactNative = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: React.ComponentType) => Component,
      View: ReactNative.View,
      Text: ReactNative.Text,
      ScrollView: ReactNative.ScrollView,
    },
    Extrapolation: { CLAMP: "clamp" },
    interpolate: () => 1,
    interpolateColor: () => "#000000",
    useAnimatedReaction: () => ReactModule.useEffect(() => undefined, []),
    useAnimatedRef: () => ReactModule.useRef(null),
    useAnimatedScrollHandler: () => jest.fn(),
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: unknown) => ReactModule.useRef({ value }).current,
    withSpring: (value: unknown) => value,
  };
});

const createStep = (id: string): OnboardingStep => ({
  id,
  title: `Title ${id}`,
  description: `Description ${id}`,
  visual: {},
  backgroundColor: "#000000",
});

const renderOnboarding = (children: React.ReactNode) =>
  render(<ThemeProvider>{children}</ThemeProvider>);

describe("Onboarding", () => {
  it("keeps Hooks stable when the step collection changes", async () => {
    const initialSteps = [createStep("one"), createStep("two")];
    const screen = await renderOnboarding(
      <Onboarding steps={initialSteps} onComplete={jest.fn()} />,
    );

    await screen.rerender(
      <ThemeProvider>
        <Onboarding
          steps={[...initialSteps, createStep("three")]}
          onComplete={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("Title three")).toBeTruthy();
  });

  it("completes a single-step flow through its accessible primary action", async () => {
    const onComplete = jest.fn();
    const user = userEvent.setup();
    const screen = await renderOnboarding(
      <Onboarding steps={[createStep("welcome")]} onComplete={onComplete} />,
    );

    const action = screen.getByRole("button", { name: "C’est parti !" });
    expect(action).toBe(screen.getByTestId("onboarding-primary-action"));

    await user.press(action);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("preserves the explicit skip command", async () => {
    const onSkip = jest.fn();
    const user = userEvent.setup();
    const screen = await renderOnboarding(
      <Onboarding
        steps={[createStep("one"), createStep("two")]}
        onComplete={jest.fn()}
        onSkip={onSkip}
      />,
    );

    await user.press(screen.getByRole("button", { name: "Passer" }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

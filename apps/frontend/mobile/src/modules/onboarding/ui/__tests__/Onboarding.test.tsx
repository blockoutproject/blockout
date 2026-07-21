import React from "react";
import {render, userEvent} from "@testing-library/react-native";

import {FancyOnboarding} from "@/src/modules/onboarding/ui/Onboarding";
import type {OnboardingStep} from "@/src/modules/onboarding/model/steps";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {Light: "light"},
  NotificationFeedbackType: {Success: "success"},
}));

jest.mock("expo-image", () => {
  const {View} = require("react-native") as typeof import("react-native");

  return {Image: View};
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

jest.mock("react-native-gesture-handler", () => {
  const pan: {
    onUpdate: jest.Mock;
    onEnd: jest.Mock;
    onFinalize: jest.Mock;
  } = {
    onUpdate: jest.fn(),
    onEnd: jest.fn(),
    onFinalize: jest.fn(),
  };
  pan.onUpdate.mockImplementation(() => pan);
  pan.onEnd.mockImplementation(() => pan);
  pan.onFinalize.mockImplementation(() => pan);

  return {
    Gesture: {Pan: () => pan},
    GestureDetector: ({children}: {children: React.ReactNode}) => children,
  };
});

jest.mock("react-native-worklets", () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  scheduleOnRN: (callback: () => unknown) => callback(),
}));

jest.mock("react-native-reanimated", () => {
  const ReactModule = require("react") as typeof React;
  const ReactNative = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      Text: ReactNative.Text,
      ScrollView: ReactNative.ScrollView,
    },
    Extrapolation: {CLAMP: "clamp"},
    interpolate: () => 1,
    interpolateColor: () => "#000000",
    useAnimatedReaction: () => ReactModule.useEffect(() => undefined, []),
    useAnimatedRef: () => ReactModule.useRef(null),
    useAnimatedScrollHandler: () => jest.fn(),
    useAnimatedStyle: (factory: () => object) => ReactModule.useMemo(factory, [factory]),
    useSharedValue: (value: unknown) => ReactModule.useRef({value}).current,
    withSpring: (value: unknown) => value,
  };
});

jest.mock("@/src/shared/ui/GradientButton", () => {
  const {Pressable, Text} = require("react-native") as typeof import("react-native");

  const MockGradientButton = ({
    label,
    onPress,
    testID,
  }: {
    label: string;
    onPress: () => void;
    testID?: string;
  }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID}>
      <Text>{label}</Text>
    </Pressable>
  );

  return {
    __esModule: true,
    GradientButton: MockGradientButton,
    default: MockGradientButton,
  };
});

const createStep = (id: string): OnboardingStep => ({
  id,
  title: `Title ${id}`,
  description: `Description ${id}`,
  visual: {},
  bg: "#000000",
});

describe("FancyOnboarding", () => {
  it("keeps Hooks stable when the step collection changes", async () => {
    const initialSteps = [createStep("one"), createStep("two")];
    const screen = await render(
      <FancyOnboarding steps={initialSteps} onComplete={jest.fn()}/>,
    );

    await screen.rerender(
      <FancyOnboarding
        steps={[...initialSteps, createStep("three")]}
        onComplete={jest.fn()}
      />,
    );

    expect(screen.getByText("Title three")).toBeTruthy();
  });

  it("completes a single-step flow through its accessible primary action", async () => {
    const onComplete = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <FancyOnboarding steps={[createStep("welcome")]} onComplete={onComplete}/>,
    );

    const action = screen.getByRole("button", {name: "C’est parti !"});
    expect(action).toBe(screen.getByTestId("onboarding-primary-action"));

    await user.press(action);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

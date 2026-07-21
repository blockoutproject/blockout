import React from "react";
import {render} from "@testing-library/react-native";

import {FancyOnboarding} from "@/src/components/onboarding/Onboarding";
import type {OnboardingStep} from "@/src/components/onboarding/steps";

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
  const {Text} = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: function MockGradientButton({label}: {label: string}) {
      return <Text>{label}</Text>;
    },
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
});

import { render, userEvent } from "@testing-library/react-native";
import React from "react";

import { ThemeProvider } from "@/src/shared/theme";
import BottomSheetFormFooter from "@/src/shared/ui/form/bottom-sheet-form-footer";

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BottomSheetFooter: ({ children }: { children: unknown }) =>
      React.createElement(View, null, children),
  };
});

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native-reanimated", () => {
  const ReactModule = require("react") as typeof React;

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: React.ComponentType) => Component,
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: unknown) => ReactModule.useRef({ value }).current,
    withSpring: (value: unknown) => value,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("BottomSheetFormFooter", () => {
  it("exposes and performs the feature-owned submit action", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <BottomSheetFormFooter
          animatedFooterPosition={{} as never}
          label="Envoyer"
          onPress={onPress}
          actionTestID="report-submit-action"
        />
      </ThemeProvider>,
    );

    const action = screen.getByRole("button", { name: "Envoyer" });
    expect(action).toBe(screen.getByTestId("report-submit-action"));

    await user.press(action);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps a loading action disabled and exposes its state", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <BottomSheetFormFooter
          animatedFooterPosition={{} as never}
          label="Envoyer"
          loading
          onPress={onPress}
          actionTestID="report-submit-action"
        />
      </ThemeProvider>,
    );

    const action = screen.getByTestId("report-submit-action");
    expect(action.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });

    await user.press(action);

    expect(onPress).not.toHaveBeenCalled();
  });
});

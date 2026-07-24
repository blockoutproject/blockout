import React from "react";
import { render, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "@/src/shared/theme";
import { Action } from "@/src/shared/ui/action";

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

describe("Action", () => {
  it("invokes the primary command through its accessible button", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <Action label="Continuer" onPress={onPress} />
      </ThemeProvider>,
    );

    await user.press(screen.getByRole("button", { name: "Continuer" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["secondary", "Action secondaire"],
    ["destructive", "Action destructive"],
    ["destructiveOutline", "Action destructive contour"],
  ] as const)(
    "exposes the %s variant as the same bounded action contract",
    async (variant, label) => {
      const screen = await render(
        <ThemeProvider>
          <Action label={label} onPress={jest.fn()} variant={variant} />
        </ThemeProvider>,
      );

      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    },
  );

  it("disables the command and exposes the loading label while busy", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <Action
          label="Enregistrer"
          loading
          loadingLabel="Enregistrement…"
          onPress={onPress}
        />
      </ThemeProvider>,
    );

    const action = screen.getByRole("button", { name: "Enregistrer" });
    expect(action.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    expect(screen.getByText("Enregistrement…")).toBeTruthy();

    await user.press(action);

    expect(onPress).not.toHaveBeenCalled();
  });
});

import { render, userEvent } from "@testing-library/react-native";
import React from "react";

import { ThemeProvider } from "@/src/shared/theme";
import { GradientPill, Pill } from "@/src/shared/ui/pill";

describe("Pill", () => {
  it("exposes a solid interactive pill as an accessible button", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <Pill label="Scores" onPress={onPress} testID="scores-filter-action" />
      </ThemeProvider>,
    );

    const action = screen.getByRole("button", { name: "Scores" });
    expect(action).toBe(screen.getByTestId("scores-filter-action"));

    await user.press(action);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps a disabled gradient pill non-interactive", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <GradientPill label="Ouvrir le live" onPress={onPress} disabled />
      </ThemeProvider>,
    );

    const action = screen.getByRole("button", { name: "Ouvrir le live" });
    expect(action.props.accessibilityState).toEqual({ disabled: true });

    await user.press(action);

    expect(onPress).not.toHaveBeenCalled();
  });
});

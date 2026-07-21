import {render, userEvent} from "@testing-library/react-native";
import React from "react";

import {ThemeProvider} from "@/src/shared/providers/ThemeProvider";
import InfoPillGradient from "@/src/shared/ui/chips/InfoPillGradient";

describe("InfoPillGradient", () => {
  it("exposes an interactive pill as an accessible button", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <InfoPillGradient
          label="Ouvrir le live"
          gradient={["#123456", "#234567"]}
          onPress={onPress}
          testID="match-live-open-action"
        />
      </ThemeProvider>,
    );

    const action = screen.getByRole("button", {name: "Ouvrir le live"});
    expect(action).toBe(screen.getByTestId("match-live-open-action"));

    await user.press(action);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

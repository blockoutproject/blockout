import React from "react";
import { Text } from "react-native";
import { render, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "@/src/shared/theme";
import { IconAction } from "@/src/shared/ui/icon-action";

describe("IconAction", () => {
  it.each(["plain", "surface", "destructive"] as const)(
    "renders the %s treatment through one accessible action",
    async (treatment) => {
      const screen = await render(
        <ThemeProvider>
          <IconAction
            accessibilityLabel={`Action ${treatment}`}
            onPress={jest.fn()}
            treatment={treatment}
          >
            <Text>Icon</Text>
          </IconAction>
        </ThemeProvider>,
      );

      expect(
        screen.getByRole("button", { name: `Action ${treatment}` }),
      ).toBeTruthy();
    },
  );

  it("invokes its command through the accessible target", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <IconAction accessibilityLabel="Modifier" onPress={onPress}>
          <Text>Icon</Text>
        </IconAction>
      </ThemeProvider>,
    );

    await user.press(screen.getByRole("button", { name: "Modifier" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["loading", { loading: true }, { busy: true, disabled: true }],
    ["disabled", { disabled: true }, { busy: false, disabled: true }],
  ] as const)(
    "keeps the %s state non-interactive",
    async (_state, props, accessibilityState) => {
      const onPress = jest.fn();
      const user = userEvent.setup();
      const screen = await render(
        <ThemeProvider>
          <IconAction
            accessibilityLabel="Actualiser"
            onPress={onPress}
            {...props}
          >
            <Text>Icon</Text>
          </IconAction>
        </ThemeProvider>,
      );

      const action = screen.getByRole("button", { name: "Actualiser" });
      expect(action.props.accessibilityState).toEqual(accessibilityState);

      await user.press(action);

      expect(onPress).not.toHaveBeenCalled();
    },
  );
});

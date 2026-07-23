import React from "react";
import { render } from "@testing-library/react-native";
import { useTheme } from "@react-navigation/native";
import { Text } from "react-native";

import {
  colors,
  spacing,
  ThemeProvider,
  useAppTheme,
} from "@/src/shared/theme";

function ThemeProbe() {
  const appTheme = useAppTheme();
  const navigationTheme = useTheme();

  return (
    <Text>
      {appTheme.background}|{navigationTheme.colors.background}
    </Text>
  );
}

describe("ThemeProvider", () => {
  it("provides application and navigation colors from the canonical theme", async () => {
    const screen = await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(
      screen.getByText(
        `${colors.background.default}|${colors.background.default}`,
      ),
    ).toBeTruthy();
    expect(spacing[2]).toBe(8);
  });
});

import React from "react";
import {render} from "@testing-library/react-native";
import {useTheme} from "@react-navigation/native";
import {Text} from "react-native";

import {ThemeProvider, useAppTheme} from "@/src/shared/providers/ThemeProvider";

const ThemeProbe = () => {
  const appTheme = useAppTheme();
  const navigationTheme = useTheme();

  return (
    <Text testID="theme-values">
      {appTheme.background}|{navigationTheme.colors.background}
    </Text>
  );
};

describe("ThemeProvider", () => {
  it("provides the application and navigation themes from one owner", async () => {
    const screen = await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText("#0b0c0d|#0b0c0d")).toBeTruthy();
  });
});

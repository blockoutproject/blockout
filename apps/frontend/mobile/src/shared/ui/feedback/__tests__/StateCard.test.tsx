import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import { ThemeProvider } from "@/src/shared/theme";
import StateCard from "@/src/shared/ui/feedback/StateCard";

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-image", () => ({
  Image: "Image",
}));

describe("StateCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders its stable content and performs an enabled action", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <StateCard
          title="Aucun résultat"
          subtitle="Réessaie dans quelques instants."
          action={{ label: "Réessayer", onPress, testID: "retry" }}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole("header", { name: "Aucun résultat" })).toBeTruthy();
    expect(screen.getByText("Réessaie dans quelques instants.")).toBeTruthy();

    fireEvent.press(screen.getByTestId("retry"));

    await waitFor(() => {
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps a loading action disabled and exposes its loading label", async () => {
    const onPress = jest.fn();
    const screen = await render(
      <ThemeProvider>
        <StateCard
          title="Chargement"
          action={{
            label: "Réessayer",
            loadingLabel: "Actualisation…",
            loading: true,
            onPress,
            testID: "retry",
          }}
        />
      </ThemeProvider>,
    );

    const action = screen.getByTestId("retry");
    expect(screen.getByText("Actualisation…")).toBeTruthy();
    expect(action.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    fireEvent.press(action);

    expect(onPress).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});

import React from "react";
import {
  act,
  fireEvent,
  render,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import { ThemeProvider } from "@/src/shared/theme";
import StateCard from "@/src/shared/ui/feedback/state-card";

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
    const user = userEvent.setup();
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

    await user.press(screen.getByTestId("retry"));

    await waitFor(() => {
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  it.each(["loading", "search", "error"] as const)(
    "renders the compact %s feedback anatomy without an illustration",
    async (variant) => {
      const screen = await render(
        <ThemeProvider>
          <StateCard
            variant={variant}
            title="État compact"
            subtitle="Message de contexte."
          />
        </ThemeProvider>,
      );

      expect(screen.getByRole("header", { name: "État compact" })).toBeTruthy();
      expect(screen.getByText("Message de contexte.")).toBeTruthy();
      expect(screen.queryByLabelText("Illustration")).toBeNull();
    },
  );

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

  it("owns the pending state of an asynchronous action", async () => {
    let resolveAction: (() => void) | undefined;
    const actionPromise = new Promise<void>((resolve) => {
      resolveAction = resolve;
    });
    const onPress = jest.fn(() => actionPromise);
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <StateCard
          title="Erreur"
          action={{
            label: "Réessayer",
            loadingLabel: "Actualisation…",
            onPress,
            testID: "retry",
          }}
        />
      </ThemeProvider>,
    );

    const pressPromise = user.press(screen.getByTestId("retry"));

    await waitFor(() => {
      expect(screen.getByText("Actualisation…")).toBeTruthy();
      expect(screen.getByTestId("retry").props.accessibilityState).toEqual({
        disabled: true,
        busy: true,
      });
    });

    await act(async () => {
      resolveAction?.();
      await actionPromise;
      await pressPromise;
    });

    await waitFor(() => {
      expect(screen.getByText("Réessayer")).toBeTruthy();
      expect(screen.getByTestId("retry").props.accessibilityState).toEqual({
        disabled: false,
        busy: false,
      });
    });
  });
});

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
import EmptyState from "@/src/shared/ui/feedback/empty-state";
import ErrorState from "@/src/shared/ui/feedback/error-state";
import LoadingState from "@/src/shared/ui/feedback/loading-state";
import SearchState from "@/src/shared/ui/feedback/search-state";
import StateCard from "@/src/shared/ui/feedback/state-card";

let mockReducedMotion = false;

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-image", () => ({
  Image: "Image",
}));

jest.mock("@/src/shared/ui/feedback/use-reduced-motion", () => ({
  useReducedMotion: () => mockReducedMotion,
}));

describe("StateCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReducedMotion = false;
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

  it.each([
    [
      "loading",
      <LoadingState key="loading" />,
      "Animation de chargement",
      "loading-state",
      true,
    ],
    [
      "empty",
      <EmptyState key="empty" />,
      "Illustration d’état vide",
      "empty-state",
      false,
    ],
    [
      "search",
      <SearchState key="search" title="Aucun résultat" />,
      "Illustration de recherche",
      "search-state",
      false,
    ],
    [
      "error",
      <ErrorState key="error" onRetry={jest.fn()} />,
      "Illustration d’erreur",
      "error-state",
      false,
    ],
  ] as const)(
    "renders the %s feedback with its representative illustration",
    async (_variant, feedback, illustrationLabel, testID, busy) => {
      const screen = await render(<ThemeProvider>{feedback}</ThemeProvider>);

      expect(
        screen.getByRole("image", { name: illustrationLabel }),
      ).toBeTruthy();
      expect(screen.getByTestId(`${testID}-illustration`)).toBeTruthy();
      expect(screen.getByTestId(testID).props.accessibilityState).toEqual({
        busy,
      });
    },
  );

  it("stops animated feedback when reduced motion is enabled", async () => {
    mockReducedMotion = true;
    const screen = await render(
      <ThemeProvider>
        <LoadingState />
      </ThemeProvider>,
    );

    expect(
      screen.getByTestId("loading-state-illustration").props.autoplay,
    ).toBe(false);
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

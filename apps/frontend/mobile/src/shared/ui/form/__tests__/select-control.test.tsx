import React from "react";
import { render, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "@/src/shared/theme";
import { SelectControl } from "@/src/shared/ui/form/select-control";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockSelectionAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-haptics", () => ({
  selectionAsync: () => mockSelectionAsync(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const ReactModule = require("react") as typeof React;
  const { View } = require("react-native");

  return {
    BottomSheetBackdrop: View,
    BottomSheetModal: ({
      children,
      ref,
    }: {
      children: React.ReactNode;
      ref?: React.Ref<unknown>;
    }) => {
      ReactModule.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
      }));

      return ReactModule.createElement(View, null, children);
    },
    BottomSheetFlatList: ({
      data,
      keyExtractor,
      renderItem,
    }: {
      data: readonly { value: string; label: string }[];
      keyExtractor: (item: { value: string; label: string }) => string;
      renderItem: (input: {
        item: { value: string; label: string };
      }) => React.ReactNode;
    }) =>
      ReactModule.createElement(
        View,
        null,
        data.map((item) =>
          ReactModule.createElement(
            ReactModule.Fragment,
            { key: keyExtractor(item) },
            renderItem({ item }),
          ),
        ),
      ),
  };
});

const options = [
  { value: "2025/2026", label: "2025/2026" },
  { value: "2026/2027", label: "2026/2027" },
] as const;

describe("SelectControl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the shared sheet through an accessible trigger", async () => {
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <SelectControl
          title="Choisir une saison"
          placeholder="Saison"
          icon="calendar-month-outline"
          options={options}
          selectedValue={null}
          onValueChange={jest.fn()}
          testID="season-select"
        />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: "Choisir une saison",
    });
    expect(trigger).toBe(screen.getByTestId("season-select"));
    expect(trigger.props.accessibilityValue).toEqual({ text: "Saison" });
    expect(trigger.props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });

    await user.press(trigger);

    expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
    expect(mockPresent).toHaveBeenCalledTimes(1);
  });

  it("selects and clears typed values through the same sheet", async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <SelectControl
          title="Choisir une saison"
          placeholder="Saison"
          icon="calendar-month-outline"
          options={options}
          selectedValue="2025/2026"
          onValueChange={onValueChange}
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("button", { name: "2025/2026" }).props
        .accessibilityState,
    ).toEqual({ selected: true });

    await user.press(screen.getByRole("button", { name: "2026/2027" }));
    expect(onValueChange).toHaveBeenLastCalledWith("2026/2027");
    expect(mockDismiss).toHaveBeenCalledTimes(1);

    await user.press(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(mockDismiss).toHaveBeenCalledTimes(2);
  });

  it("disables an empty select without opening its sheet", async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <SelectControl
          title="Choisir une saison"
          placeholder="Saison"
          icon="calendar-month-outline"
          options={[]}
          selectedValue={null}
          onValueChange={onValueChange}
        />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: "Choisir une saison",
    });
    expect(trigger.props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });

    await user.press(trigger);

    expect(mockPresent).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("exposes a busy disabled state while options are loading", async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <SelectControl
          title="Choisir une division"
          placeholder="Division"
          icon="trophy-outline"
          options={options}
          selectedValue={null}
          onValueChange={onValueChange}
          loading
        />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: "Choisir une division",
    });
    expect(trigger.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    await user.press(trigger);

    expect(mockPresent).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

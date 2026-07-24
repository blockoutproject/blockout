import { act, render } from "@testing-library/react-native";
import React from "react";
import { StyleSheet } from "react-native";

import { ThemeProvider } from "@/src/shared/theme";
import SheetTextInput from "@/src/shared/ui/form/SheetTextInput";

jest.mock("@gorhom/bottom-sheet", () => {
  const { TextInput } = require("react-native");

  return { BottomSheetTextInput: TextInput };
});

describe("SheetTextInput", () => {
  it("uses the canonical focused and default field borders", async () => {
    const screen = await render(
      <ThemeProvider>
        <SheetTextInput placeholder="Pseudo" />
      </ThemeProvider>,
    );
    const input = screen.getByPlaceholderText("Pseudo");
    const currentStyle = () =>
      StyleSheet.flatten(screen.getByPlaceholderText("Pseudo").props.style);

    expect(currentStyle()).toMatchObject({
      borderColor: "#343434",
      borderWidth: 1,
      minHeight: 48,
    });

    await act(() => input.props.onFocus({}));

    expect(currentStyle()).toMatchObject({
      borderColor: "#2d9cdb",
      borderWidth: 2,
    });

    await act(() => screen.getByPlaceholderText("Pseudo").props.onBlur({}));

    expect(currentStyle()).toMatchObject({
      borderColor: "#343434",
      borderWidth: 1,
    });
  });
});

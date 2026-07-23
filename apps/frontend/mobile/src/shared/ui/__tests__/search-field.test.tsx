import React from "react";
import { render, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "@/src/shared/theme";
import { SearchField } from "@/src/shared/ui/search-field";

jest.mock("@gorhom/bottom-sheet", () => {
  const { TextInput } =
    require("react-native") as typeof import("react-native");

  return { BottomSheetTextInput: TextInput };
});

describe("SearchField", () => {
  it("clears a controlled search value through its accessible action", async () => {
    const onChangeText = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <SearchField
          value="Cannes"
          onChangeText={onChangeText}
          inSheet={false}
        />
      </ThemeProvider>,
    );

    await user.press(
      screen.getByRole("button", { name: "Effacer la recherche" }),
    );

    expect(onChangeText).toHaveBeenCalledWith("");
  });
});

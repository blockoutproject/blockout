import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import { ThemeProvider } from "../../theme/theme-provider";
import { SearchField, type SearchFieldProps } from "../search-field";

/** The feature retains the search draft and clears it only after the shared action. */
function SearchExample(
  availability: Pick<SearchFieldProps, "editable" | "readOnly">,
) {
  const [value, setValue] = useState("Volley");
  return (
    <SearchField
      label="Rechercher une division"
      {...availability}
      value={value}
      onChangeText={setValue}
      onClear={() => setValue("")}
    />
  );
}

it("clears the caller-owned search and removes its empty clear action", async () => {
  // Given
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <SearchExample />
    </ThemeProvider>,
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Effacer la recherche" }),
  );

  // Then
  expect(screen.getByLabelText("Rechercher une division")).toHaveDisplayValue(
    "",
  );
  expect(
    screen.queryByRole("button", { name: "Effacer la recherche" }),
  ).not.toBeOnTheScreen();
});

it.each([{ editable: false }, { editable: true, readOnly: true }])(
  "preserves an unavailable search draft and disables clearing: %j",
  async (availability) => {
    // Given
    const user = userEvent.setup();
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    await render(
      <ThemeProvider>
        <SearchField
          label="Rechercher une division"
          value="Volley"
          {...availability}
          onChangeText={onChangeText}
          onClear={onClear}
        />
      </ThemeProvider>,
    );

    // When
    await user.type(screen.getByLabelText("Rechercher une division"), " Club");
    await user.press(
      screen.getByRole("button", {
        name: "Effacer la recherche",
        disabled: true,
      }),
    );

    // Then
    expect(screen.getByDisplayValue("Volley")).toBeDisabled();
    expect(onChangeText).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  },
);

it("uses native readOnly precedence for input and clear availability", async () => {
  // Given
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <SearchExample editable={false} readOnly={false} />
    </ThemeProvider>,
  );

  // When
  await user.type(screen.getByLabelText("Rechercher une division"), " Club");

  // Then
  expect(screen.getByDisplayValue("Volley Club")).toBeEnabled();

  // When
  await user.press(
    screen.getByRole("button", { name: "Effacer la recherche" }),
  );

  // Then
  expect(screen.getByLabelText("Rechercher une division")).toHaveDisplayValue(
    "",
  );
  expect(
    screen.queryByRole("button", { name: "Effacer la recherche" }),
  ).not.toBeOnTheScreen();
});

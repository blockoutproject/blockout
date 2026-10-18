import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { useState } from "react";
import { ThemeProvider } from "../../theme/theme-provider";
import { TextField } from "../text-field";

/** Owns editable data exactly as a feature form does; the control owns no business value. */
function FormField() {
  const [value, setValue] = useState("");
  return (
    <TextField label="Nom du club" value={value} onChangeText={setValue} />
  );
}

it("edits a caller-owned value through its persistent label", async () => {
  // Given
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <FormField />
    </ThemeProvider>,
  );

  // When
  await user.type(screen.getByLabelText("Nom du club"), "Volley Club");

  // Then
  expect(screen.getByDisplayValue("Volley Club")).toBeOnTheScreen();
  expect(screen.getByText("Nom du club")).toBeOnTheScreen();
});

it("keeps the draft and exposes its current validation error", async () => {
  // Given
  const root = await render(
    <ThemeProvider>
      <TextField label="Nom du club" value="Volley" helper="Nom officiel" />
    </ThemeProvider>,
  );

  // When
  await root.rerender(
    <ThemeProvider>
      <TextField
        label="Nom du club"
        value="Volley"
        helper="Nom officiel"
        error="Ce nom est déjà utilisé."
      />
    </ThemeProvider>,
  );

  // Then
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Ce nom est déjà utilisé.",
  );
  expect(screen.getByHintText("Ce nom est déjà utilisé.")).toBeOnTheScreen();
  expect(screen.queryByText("Nom officiel")).not.toBeOnTheScreen();
});

it("forwards native focus and blur to the owning form", async () => {
  // Given
  const onFocus = jest.fn();
  const onBlur = jest.fn();
  await render(
    <ThemeProvider>
      <TextField label="Nom du club" onFocus={onFocus} onBlur={onBlur} />
    </ThemeProvider>,
  );

  // When
  await fireEvent(screen.getByLabelText("Nom du club"), "focus", {
    nativeEvent: {},
  });
  await fireEvent(screen.getByLabelText("Nom du club"), "blur", {
    nativeEvent: {},
  });

  // Then
  expect(onFocus).toHaveBeenCalledTimes(1);
  expect(onBlur).toHaveBeenCalledTimes(1);
});

it.each([{ editable: false }, { editable: true, readOnly: true }])(
  "prevents editing an unavailable field: %j",
  async (availability) => {
    // Given
    const onChangeText = jest.fn();
    const user = userEvent.setup();
    await render(
      <ThemeProvider>
        <TextField
          label="Nom du club"
          value="Volley"
          {...availability}
          onChangeText={onChangeText}
        />
      </ThemeProvider>,
    );

    // When
    await user.type(screen.getByLabelText("Nom du club"), " autre");

    // Then
    expect(onChangeText).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Volley")).toBeDisabled();
  },
);

it("honors native readOnly precedence when editing remains allowed", async () => {
  // Given
  const onChangeText = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <TextField
        label="Nom du club"
        value=""
        editable={false}
        readOnly={false}
        onChangeText={onChangeText}
      />
    </ThemeProvider>,
  );

  // When
  await user.type(screen.getByLabelText("Nom du club"), "V");

  // Then
  expect(onChangeText).toHaveBeenCalledWith("V");
  expect(screen.getByLabelText("Nom du club")).toBeEnabled();
});

import { render, screen, userEvent } from "@testing-library/react-native";
import { Check, ChevronRight } from "lucide-react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { Button } from "../button";

it.each([
  { name: "plain", trailingIcon: undefined },
  { name: "trailing glyph", trailingIcon: ChevronRight },
])(
  "announces one complete action and activates it once: $name",
  async ({ trailingIcon }) => {
    // Given
    const onPress = jest.fn();
    const user = userEvent.setup();
    const label = "Enregistrer les modifications de cette compétition";
    await render(
      <ThemeProvider>
        <Button label={label} onPress={onPress} trailingIcon={trailingIcon} />
      </ThemeProvider>,
    );

    // When
    await user.press(screen.getByRole("button", { name: label }));

    // Then
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  },
);

it.each([
  { disabled: true, loading: false, trailingIcon: undefined },
  { disabled: false, loading: true, trailingIcon: undefined },
  { disabled: true, loading: false, trailingIcon: ChevronRight },
  { disabled: false, loading: true, trailingIcon: ChevronRight },
])("prevents activation while unavailable: %j", async (state) => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <Button label="Enregistrer" onPress={onPress} {...state} />
    </ThemeProvider>,
  );

  // When
  const action = screen.getByRole("button", {
    name: "Enregistrer",
    disabled: true,
    busy: state.loading,
  });
  await user.press(action);

  // Then
  expect(onPress).not.toHaveBeenCalled();
});

it("exposes a compact selected action and its season without adding a second control", async () => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <Button
        label="Suivi"
        size="compact"
        variant="inverse"
        leadingIcon={Check}
        selected
        accessibilityHint="Saison 2026/2027"
        onPress={onPress}
      />
    </ThemeProvider>,
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Suivi", selected: true }),
  );

  // Then
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.getByHintText("Saison 2026/2027")).toBeOnTheScreen();
});

import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
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

it("announces a contextual destination as one named link", async () => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <Button
        label="Ouvrir le lien"
        accessibilityRole="link"
        contextColor="#C74750"
        contextGradient={["#C74750", "#A73A42", "#892D36"]}
        contextForeground="#FFFFFF"
        onPress={onPress}
      />
    </ThemeProvider>,
  );

  // When
  await user.press(screen.getByRole("link", { name: "Ouvrir le lien" }));

  // Then
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button")).toBeNull();
});

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

/** The caller owns selection; the control must announce the updated state after the same action. */
function FollowChoice() {
  const [selected, setSelected] = useState(true);
  return (
    <Button
      label={selected ? "Suivi" : "Suivre"}
      size="compact"
      variant="inverse"
      leadingIcon={Check}
      selected={selected}
      accessibilityHint="Saison 2026/2027"
      onPress={() => setSelected((current) => !current)}
    />
  );
}

it("updates its caller-owned selection without adding a second control", async () => {
  // Given
  const user = userEvent.setup();
  await render(<FollowChoice />, { wrapper: ThemeProvider });

  // When
  await user.press(
    screen.getByRole("button", { name: "Suivi", selected: true }),
  );

  // Then
  expect(
    screen.getByRole("button", { name: "Suivre", selected: false }),
  ).toBeOnTheScreen();
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.getByHintText("Saison 2026/2027")).toBeOnTheScreen();
});

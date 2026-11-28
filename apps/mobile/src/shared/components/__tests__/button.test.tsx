import { render, screen, userEvent } from "@testing-library/react-native";
import { ChevronRight } from "lucide-react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { Button } from "../button";

it("announces one complete action independently of its decorative glyph", async () => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  const label = "Enregistrer les modifications de cette compétition";
  await render(
    <ThemeProvider>
      <Button label={label} onPress={onPress} trailingIcon={ChevronRight} />
    </ThemeProvider>,
  );

  // When
  await user.press(screen.getByRole("button", { name: label }));

  // Then
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole("button")).toHaveLength(1);
});

it.each([
  { disabled: true, loading: false },
  { disabled: false, loading: true },
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

import { render, screen, userEvent } from "@testing-library/react-native";
import { RotateCw, X } from "lucide-react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { IconButton } from "../icon-button";

it("announces the caller's action independently of its decorative icon", async () => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <IconButton label="Fermer le formulaire" onPress={onPress}>
        <X accessible={false} />
      </IconButton>
    </ThemeProvider>,
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Fermer le formulaire" }),
  );

  // Then
  expect(onPress).toHaveBeenCalledTimes(1);
});

it.each([
  { disabled: true, loading: false },
  { disabled: false, loading: true },
])("blocks an unavailable icon action: %j", async (state) => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <IconButton label="Actualiser" onPress={onPress} {...state}>
        <RotateCw accessible={false} />
      </IconButton>
    </ThemeProvider>,
  );

  // When
  await user.press(
    screen.getByRole("button", {
      name: "Actualiser",
      disabled: true,
      busy: state.loading,
    }),
  );

  // Then
  expect(onPress).not.toHaveBeenCalled();
});

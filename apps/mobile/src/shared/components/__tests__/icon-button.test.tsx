import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import { Text } from "react-native";
import { RotateCw, X } from "lucide-react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { IconButton } from "../icon-button";

/** The caller retains form visibility; the icon control supplies only its named native action. */
function DismissibleForm() {
  const [open, setOpen] = useState(true);
  return open ? (
    <IconButton label="Fermer le formulaire" onPress={() => setOpen(false)}>
      <X accessible={false} />
    </IconButton>
  ) : (
    <Text>Formulaire fermé</Text>
  );
}

it("announces the caller's action independently of its decorative icon", async () => {
  // Given
  const user = userEvent.setup();
  await render(<DismissibleForm />, { wrapper: ThemeProvider });

  // When
  await user.press(
    screen.getByRole("button", { name: "Fermer le formulaire" }),
  );

  // Then
  expect(screen.getByText("Formulaire fermé")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Fermer le formulaire" }),
  ).not.toBeOnTheScreen();
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

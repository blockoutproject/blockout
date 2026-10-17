import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { IconButton } from "../icon-button";

afterEach(cleanup);

it("announces the caller's action independently of its decorative icon", async () => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <IconButton label="Fermer le formulaire" onPress={onPress}>
        <Text>×</Text>
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
        <Text>↻</Text>
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

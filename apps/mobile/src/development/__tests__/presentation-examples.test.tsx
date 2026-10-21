import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Alert, Appearance, Text } from "react-native";
import { ThemeProvider, useTheme } from "../../shared/theme/theme-provider";
import { FormExampleScreen } from "../presentation-examples";

jest.unmock("react-native/Libraries/Utilities/useColorScheme");

afterEach(() => {
  jest.restoreAllMocks();
});

/** Observes the real theme context beside the form without a test-only production prop. */
function AppearanceLabel() {
  const { scheme } = useTheme();
  return <Text accessibilityLabel="Apparence">{scheme}</Text>;
}

it("keeps invalid fields editable without opening confirmation", async () => {
  // Given
  const confirm = jest.fn();
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  const user = userEvent.setup();
  await render(<FormExampleScreen onConfirm={confirm} />, {
    wrapper: ThemeProvider,
  });
  await user.type(screen.getByLabelText("Nom du club"), "Volley");

  // When
  await user.press(screen.getByRole("button", { name: "Confirmer" }));

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Complétez le dernier champ.",
  );
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
  expect(alert).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
});

it("waits for explicit native confirmation before passing the current values to the owner", async () => {
  // Given
  const confirm = jest.fn();
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  const user = userEvent.setup();
  await render(<FormExampleScreen onConfirm={confirm} />, {
    wrapper: ThemeProvider,
  });
  await user.type(screen.getByLabelText("Nom du club"), "Volley");
  await user.type(screen.getByLabelText("Dernier champ"), "Paris");

  // When
  await user.press(screen.getByRole("button", { name: "Confirmer" }));

  // Then
  expect(alert).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2];
  expect(buttons?.find((button) => button.text === "Annuler")?.style).toBe(
    "cancel",
  );
  await act(() =>
    buttons?.find((button) => button.text === "Confirmer")?.onPress?.(),
  );
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(confirm).toHaveBeenCalledWith({ name: "Volley", last: "Paris" });
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
});

it("updates the mounted form's appearance without losing its draft", async () => {
  // Given
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  const subscribe = jest.spyOn(Appearance, "addChangeListener");
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <AppearanceLabel />
      <FormExampleScreen onConfirm={jest.fn()} />
    </ThemeProvider>,
  );
  await user.type(screen.getByLabelText("Nom du club"), "Valeur conservée");

  // When
  jest.mocked(Appearance.getColorScheme).mockReturnValue("dark");
  await act(() => {
    for (const [listener] of subscribe.mock.calls)
      listener({ colorScheme: "dark" });
  });

  // Then
  expect(screen.getByLabelText("Apparence")).toHaveTextContent("dark");
  expect(screen.getByDisplayValue("Valeur conservée")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Confirmer" })).toBeOnTheScreen();
});

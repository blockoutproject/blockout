import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { useState } from "react";
import { Switch } from "react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { Button } from "../button";
import { Sheet } from "../sheet";

/** Owns its contextual choice; native presentation and screen-reader focus need device evidence. */
function ChoiceSheet({
  onConfirm,
  onClose,
}: {
  onConfirm: (value: boolean) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(false);
  return (
    <Sheet
      onClose={onClose}
      title="Filtres"
      message="Choisissez les rencontres à afficher."
    >
      <Switch
        accessibilityLabel="Inclure les rencontres terminées"
        value={selected}
        onValueChange={setSelected}
      />
      <Button label="Appliquer" onPress={() => onConfirm(selected)} />
    </Sheet>
  );
}

it("requests dismissal through the accessible close action", async () => {
  // Given
  const dismiss = jest.fn();
  const user = userEvent.setup();
  await render(<ChoiceSheet onConfirm={jest.fn()} onClose={dismiss} />, {
    wrapper: ThemeProvider,
  });

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(dismiss).toHaveBeenCalledTimes(1);
});

it("lets the caller apply the current choice without implicitly dismissing", async () => {
  // Given
  const confirm = jest.fn();
  const dismiss = jest.fn();
  const user = userEvent.setup();
  await render(<ChoiceSheet onConfirm={confirm} onClose={dismiss} />, {
    wrapper: ThemeProvider,
  });
  await fireEvent(
    screen.getByRole("switch", { name: "Inclure les rencontres terminées" }),
    "valueChange",
    true,
  );

  // When
  await user.press(screen.getByRole("button", { name: "Appliquer" }));

  // Then
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(confirm).toHaveBeenCalledWith(true);
  expect(dismiss).not.toHaveBeenCalled();
  expect(screen.getByRole("header", { name: "Filtres" })).toBeOnTheScreen();
});

import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { useRef, useState, type PropsWithChildren } from "react";
import { Appearance, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../../theme/theme-provider";
import { Button } from "../button";
import { Sheet } from "../sheet";
import { TextField } from "../text-field";

// Gorhom's upstream mock controls the native modal/animation boundary; it does not simulate visibility or gestures.
jest.mock("@gorhom/bottom-sheet", () => require("@gorhom/bottom-sheet/mock"));
jest.unmock("react-native/Libraries/Utilities/useColorScheme");

afterEach(() => {
  jest.restoreAllMocks();
});

/** Supplies real theme/safe-area context and the library's mocked native modal provider. */
function Providers({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 59, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider>
        <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Owns confirmation and draft state; native presentation is verified separately on devices. */
function Form({ onConfirm }: { onConfirm: (value: string) => void }) {
  const modal = useRef<BottomSheetModal>(null);
  const [value, setValue] = useState("");
  const { scheme } = useTheme();
  return (
    <Sheet
      ref={modal}
      title="Modifier le club"
      message="Complétez le nom officiel."
      footer={<Button label="Confirmer" onPress={() => onConfirm(value)} />}
    >
      <Text accessibilityLabel="Apparence">{scheme}</Text>
      <TextField
        label="Nom du club"
        value={value}
        onChangeText={setValue}
        inputComponent={BottomSheetTextInput}
      />
    </Sheet>
  );
}

it("requests dismissal through the accessible close action", async () => {
  // Given
  const dismiss = jest.spyOn(BottomSheetModal.prototype, "dismiss");
  const user = userEvent.setup();
  await render(<Form onConfirm={jest.fn()} />, { wrapper: Providers });

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(dismiss).toHaveBeenCalledTimes(1);
});

it("lets the caller confirm the current input without implicitly dismissing", async () => {
  // Given
  const confirm = jest.fn();
  const dismiss = jest.spyOn(BottomSheetModal.prototype, "dismiss");
  const user = userEvent.setup();
  await render(<Form onConfirm={confirm} />, { wrapper: Providers });
  await user.type(screen.getByLabelText("Nom du club"), "Volley");

  // When
  await user.press(screen.getByRole("button", { name: "Confirmer" }));

  // Then
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(confirm).toHaveBeenCalledWith("Volley");
  expect(dismiss).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Modifier le club" }),
  ).toBeOnTheScreen();
});

it("updates the mounted form's appearance without losing the caller's draft", async () => {
  // Given
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  const subscribe = jest.spyOn(Appearance, "addChangeListener");
  const user = userEvent.setup();
  await render(<Form onConfirm={jest.fn()} />, { wrapper: Providers });
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
  expect(screen.getByRole("button", { name: "Fermer" })).toBeOnTheScreen();
});

import { useState } from "react";
import { Stack, router } from "expo-router";
import {
  act,
  cleanup,
  renderRouter,
  screen,
} from "expo-router/testing-library";
import { userEvent } from "@testing-library/react-native";
import { Appearance, Text } from "react-native";
import { ThemeProvider, useTheme } from "../../theme/theme-provider";
import { Button } from "../button";
import { Sheet, useSheetScreenOptions } from "../sheet";
import { TextField } from "../text-field";

jest.unmock("react-native/Libraries/Utilities/useColorScheme");

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

/** Uses the real Expo stack; its native screen surfaces are controlled by Expo's test setup. */
function Layout() {
  return (
    <ThemeProvider>
      <Routes />
    </ThemeProvider>
  );
}

/** Configures the native host before opening the sheet, using the current semantic surface. */
function Routes() {
  const options = useSheetScreenOptions();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" options={options} />
    </Stack>
  );
}

/** Keeps a caller-owned draft on the covered route while a sheet is presented. */
function Home() {
  const [value, setValue] = useState("");
  return (
    <>
      <TextField
        label="Brouillon initial"
        value={value}
        onChangeText={setValue}
      />
      <Button
        label="Ouvrir le formulaire"
        onPress={() => router.push("/edit")}
      />
    </>
  );
}

/** The sheet composes ordinary caller-owned fields rather than a generic form engine. */
function Edit() {
  const theme = useTheme();
  const [value, setValue] = useState("");
  return (
    <Sheet title="Modifier le club" message="Complétez le nom officiel.">
      <Text accessibilityLabel="Apparence">{theme.scheme}</Text>
      <TextField label="Nom du club" value={value} onChangeText={setValue} />
    </Sheet>
  );
}

it("dismisses through the accessible close action and preserves the covered route's draft", async () => {
  // Given
  const user = userEvent.setup();
  await renderRouter({ _layout: Layout, index: Home, edit: Edit });
  await user.type(screen.getByLabelText("Brouillon initial"), "Ne pas perdre");
  await user.press(
    screen.getByRole("button", { name: "Ouvrir le formulaire" }),
  );
  expect(
    screen.getByRole("header", { name: "Modifier le club" }),
  ).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(
    screen.queryByRole("header", { name: "Modifier le club" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByDisplayValue("Ne pas perdre")).toBeOnTheScreen();
});

it("leaves dismissal and return to the native navigation owner", async () => {
  // Given
  const user = userEvent.setup();
  await renderRouter({ _layout: Layout, index: Home, edit: Edit });
  await user.press(
    screen.getByRole("button", { name: "Ouvrir le formulaire" }),
  );
  await user.type(screen.getByLabelText("Nom du club"), "Volley");

  // When
  await act(() => router.back());

  // Then
  expect(
    screen.queryByRole("header", { name: "Modifier le club" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Ouvrir le formulaire" }),
  ).toBeOnTheScreen();
});

it("returns a directly linked sheet to its anchored background route", async () => {
  // Given
  const user = userEvent.setup();
  await renderRouter(
    {
      _layout: { default: Layout, unstable_settings: { anchor: "index" } },
      index: Home,
      edit: Edit,
    },
    { initialUrl: "/edit" },
  );

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(
    screen.queryByRole("header", { name: "Modifier le club" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Ouvrir le formulaire" }),
  ).toBeOnTheScreen();
});

it("updates appearance with a sheet open without losing its draft or navigation", async () => {
  // Given
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  const subscribe = jest.spyOn(Appearance, "addChangeListener");
  const user = userEvent.setup();
  await renderRouter({ _layout: Layout, index: Home, edit: Edit });
  await user.press(
    screen.getByRole("button", { name: "Ouvrir le formulaire" }),
  );
  await user.type(screen.getByLabelText("Nom du club"), "Valeur conservée");
  expect(screen.getByDisplayValue("Valeur conservée")).toBeOnTheScreen();

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

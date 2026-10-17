import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { useState } from "react";
import { Appearance, Text, TextInput } from "react-native";
import { ThemeProvider, useTheme } from "../theme-provider";

jest.unmock("react-native/Libraries/Utilities/useColorScheme");

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

/** Displays the public presentation contract and owns a draft without mocking the provider. */
function ThemeConsumer() {
  const theme = useTheme();
  const [value, setValue] = useState("");
  return (
    <>
      <Text>{theme.scheme}</Text>
      <Text accessibilityLabel="Accent sportif">{theme.context.primary}</Text>
      <Text accessibilityLabel="Accent de sélection">
        {theme.membership.fill}
      </Text>
      <TextInput
        accessibilityLabel="Brouillon"
        value={value}
        onChangeText={setValue}
      />
    </>
  );
}

it.each(["light", "dark", null, "unspecified"] as const)(
  "uses the native initial appearance %s with light as the absent-scheme fallback",
  async (scheme) => {
    // Given
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue(scheme);

    // When
    await render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    // Then
    expect(
      screen.getByText(scheme === "dark" ? "dark" : "light"),
    ).toBeOnTheScreen();
  },
);

it("updates a mounted draft when the native appearance changes", async () => {
  // Given
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  const subscribe = jest.spyOn(Appearance, "addChangeListener");
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <ThemeConsumer />
    </ThemeProvider>,
  );
  await user.type(screen.getByLabelText("Brouillon"), "Valeur conservée");

  // When
  jest.mocked(Appearance.getColorScheme).mockReturnValue("dark");
  await act(() => {
    for (const [listener] of subscribe.mock.calls)
      listener({ colorScheme: "dark" });
  });

  // Then
  expect(screen.getByText("dark")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Valeur conservée")).toBeOnTheScreen();
});

it("uses current caller-owned sporting and Pro presentation without retaining the previous accent", async () => {
  // Given
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  const sportingContext = {
    light: {
      primary: "#B42340",
      actionStart: "#B42340",
      actionEnd: "#86192E",
      onAction: "#FFFFFF",
      shadow: "#00000014",
    },
    dark: {
      primary: "#FFB3C3",
      actionStart: "#FFB3C3",
      actionEnd: "#FFDDE5",
      onAction: "#171717",
      shadow: "#00000038",
    },
  };
  const root = await render(
    <ThemeProvider context={sportingContext} proAccent>
      <ThemeConsumer />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText("Accent de sélection")).toHaveTextContent(
    "#E7D39B",
  );

  // When
  await root.rerender(
    <ThemeProvider context={sportingContext}>
      <ThemeConsumer />
    </ThemeProvider>,
  );

  // Then
  expect(screen.getByLabelText("Accent sportif")).toHaveTextContent("#B42340");
  expect(screen.getByLabelText("Accent de sélection")).toHaveTextContent(
    "#171717",
  );
  expect(screen.getByText("light")).toBeOnTheScreen();
});

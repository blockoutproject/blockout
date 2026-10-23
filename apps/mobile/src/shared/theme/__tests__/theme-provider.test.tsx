import { act, render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import {
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  useTheme as useNavigationTheme,
} from "expo-router";
import {
  AccessibilityInfo,
  Appearance,
  DeviceEventEmitter,
  Text,
  TextInput,
} from "react-native";
import { Button } from "../../components/button";
import { ThemeProvider, useTheme } from "../theme-provider";

jest.unmock("react-native/Libraries/Utilities/useColorScheme");
jest.unmock(
  "react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo",
);

afterEach(() => {
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
      <Text accessibilityLabel="Bordure de navigation">
        {theme.membership.border}
      </Text>
      <TextInput
        accessibilityLabel="Brouillon"
        value={value}
        onChangeText={setValue}
      />
    </>
  );
}

/** Observes the public Router theme used by native navigation surfaces. */
function NavigationSurfaces() {
  const theme = useNavigationTheme();
  return (
    <Text accessibilityLabel="Surfaces natives">
      {String(theme.colors.background)} {String(theme.colors.card)}
    </Text>
  );
}

it.each(["light", "dark", null] as const)(
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

it("updates navigation surfaces and preserves a mounted draft when native appearance changes", async () => {
  // Given
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  const subscribe = jest.spyOn(Appearance, "addChangeListener");
  const user = userEvent.setup();
  await render(
    <NavigationThemeProvider value={DefaultTheme}>
      <ThemeProvider>
        <ThemeConsumer />
        <NavigationSurfaces />
      </ThemeProvider>
    </NavigationThemeProvider>,
  );
  expect(screen.getByLabelText("Surfaces natives")).toHaveTextContent(
    "#FCFCFD #FFFFFF",
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
  expect(screen.getByLabelText("Surfaces natives")).toHaveTextContent(
    "#0D0D0E #19191A",
  );
  expect(screen.getByDisplayValue("Valeur conservée")).toBeOnTheScreen();
});

it("updates the Pro palette while preserving a mounted draft on native appearance changes", async () => {
  // Given
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  const subscribe = jest.spyOn(Appearance, "addChangeListener");
  const user = userEvent.setup();
  await render(
    <ThemeProvider proAccent>
      <ThemeConsumer />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText("Accent de sélection")).toHaveTextContent(
    "#E7D39B",
  );
  expect(screen.getByLabelText("Bordure de navigation")).toHaveTextContent(
    "#C1AA68",
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
  expect(screen.getByLabelText("Accent de sélection")).toHaveTextContent(
    "#E2C985",
  );
  expect(screen.getByLabelText("Bordure de navigation")).toHaveTextContent(
    "#A99662",
  );
  expect(screen.getByDisplayValue("Valeur conservée")).toBeOnTheScreen();
});

it.each(["light", "dark"] as const)(
  "changes sporting inputs and removes Pro presentation independently without losing the draft in %s",
  async (scheme) => {
    // Given
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue(scheme);
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
    const user = userEvent.setup();
    const root = await render(
      <ThemeProvider proAccent>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    await user.type(screen.getByLabelText("Brouillon"), "Saisie conservée");

    // When
    await root.rerender(
      <ThemeProvider context={sportingContext} proAccent>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    // Then
    expect(screen.getByLabelText("Accent sportif")).toHaveTextContent(
      sportingContext[scheme].primary,
    );
    expect(screen.getByLabelText("Accent de sélection")).toHaveTextContent(
      scheme === "dark" ? "#E2C985" : "#E7D39B",
    );
    expect(screen.getByDisplayValue("Saisie conservée")).toBeOnTheScreen();

    // When
    await root.rerender(
      <ThemeProvider context={sportingContext}>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    // Then
    expect(screen.getByLabelText("Accent sportif")).toHaveTextContent(
      sportingContext[scheme].primary,
    );
    expect(screen.getByLabelText("Accent de sélection")).toHaveTextContent(
      scheme === "dark" ? "#F1F1F2" : "#171717",
    );
    expect(screen.getByText(scheme)).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Saisie conservée")).toBeOnTheScreen();
  },
);

it.each([true, false])(
  "preserves appearance, Pro presentation and the draft when native reduced motion becomes %s",
  async (reducedMotion) => {
    // Given
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("dark");
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(!reducedMotion);
    const subscribe = jest.spyOn(AccessibilityInfo, "addEventListener");
    const user = userEvent.setup();
    await render(
      <ThemeProvider proAccent>
        <ThemeConsumer />
        <Button label="Enregistrement" loading onPress={jest.fn()} />
      </ThemeProvider>,
    );
    await user.type(screen.getByLabelText("Brouillon"), "Saisie conservée");
    expect(subscribe).toHaveBeenCalledWith(
      "reduceMotionChanged",
      expect.any(Function),
    );

    // When
    await act(() => {
      // jest-expo uses iOS, whose native event keeps the public event name.
      DeviceEventEmitter.emit("reduceMotionChanged", reducedMotion);
    });

    // Then
    expect(screen.getByText("dark")).toBeOnTheScreen();
    expect(screen.getByLabelText("Accent de sélection")).toHaveTextContent(
      "#E2C985",
    );
    expect(screen.getByDisplayValue("Saisie conservée")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Enregistrement", busy: true }),
    ).toBeDisabled();
  },
);

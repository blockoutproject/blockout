import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { SeasonSelector } from "../season-selector";

it("announces the caller's season and activates its presentation once", async () => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <SeasonSelector
        label="2026/2027"
        accessibilityLabel="Saison du club"
        expanded={false}
        onPress={onPress}
      />
    </ThemeProvider>,
  );

  // When
  const selector = screen.getByRole("button", {
    name: "Saison du club",
    expanded: false,
  });
  await user.press(selector);

  // Then
  expect(selector).toHaveTextContent("2026/2027");
  expect(selector).toHaveAccessibilityValue({ text: "2026/2027" });
  expect(onPress).toHaveBeenCalledTimes(1);
});

it("prevents opening unavailable choices while retaining their announced value", async () => {
  // Given
  const onPress = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <SeasonSelector
        label="Saison"
        accessibilityLabel="Saison des suivis"
        disabled
        onPress={onPress}
      />
    </ThemeProvider>,
  );

  // When
  const selector = screen.getByRole("button", {
    name: "Saison des suivis",
    disabled: true,
  });
  await user.press(selector);

  // Then
  expect(selector).toHaveAccessibilityValue({ text: "Saison" });
  expect(onPress).not.toHaveBeenCalled();
});

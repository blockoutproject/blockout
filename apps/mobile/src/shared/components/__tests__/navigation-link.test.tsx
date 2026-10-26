import { screen, userEvent } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { NavigationLink } from "../navigation-link";

it("opens its route through the full named native link", async () => {
  // Given: a shared navigation action uses the real Router and a local destination.
  const label = "Modifier la présentation de cette compétition régionale";
  await renderRouter(
    {
      index: () => <NavigationLink href="/presentation" label={label} />,
      presentation: () => <Text>Présentation de la compétition</Text>,
    },
    {
      initialUrl: "/",
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    },
  );
  const user = userEvent.setup();

  // When: the native press sequence reaches the action through its complete name.
  await user.press(screen.getByRole("link", { name: label }));

  // Then: Router activation survives the component's native pressed-state boundary.
  expect(
    await screen.findByText("Présentation de la compétition"),
  ).toBeOnTheScreen();
});

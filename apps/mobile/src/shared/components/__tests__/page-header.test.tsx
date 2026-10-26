import { act, screen, userEvent } from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { PageHeader } from "../page-header";

/** Uses the real Router stack to distinguish ordinary history from direct resource entry. */
const routes = {
  _layout: () => (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  ),
  index: () => <Text>Accueil</Text>,
  previous: () => <Text>Liste précédente</Text>,
  detail: () => <PageHeader title="Détail" />,
};

it("returns to the actual previous destination", async () => {
  // Given
  await renderRouter(routes, { initialUrl: "/previous" });
  await act(() => router.push("/detail"));
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  expect(await screen.findByText("Liste précédente")).toBeOnTheScreen();
});

it("returns home when a direct entry has no previous destination", async () => {
  // Given
  await renderRouter(routes, { initialUrl: "/detail" });
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  expect(await screen.findByText("Accueil")).toBeOnTheScreen();
});

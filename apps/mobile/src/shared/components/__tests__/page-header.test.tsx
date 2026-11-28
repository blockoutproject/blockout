import { act, screen, userEvent } from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { PageHeader } from "../page-header";

/** Uses the real Router stack to distinguish ordinary history from direct resource entry. */
const routes = {
  _layout: () => (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  ),
  "(ordinary)/(tabs)/(home)/(personal)/index": () => <Text>Accueil</Text>,
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
  expect(screen.getByRole("header", { name: "Détail" })).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  expect(await screen.findByText("Accueil")).toBeOnTheScreen();
});

it("keeps the accessible heading when compact content replaces the visual title", async () => {
  // Given
  const compactRoutes = {
    ...routes,
    compact: () => (
      <PageHeader title="Équipe">
        <Text accessible={false}>Nom compact</Text>
      </PageHeader>
    ),
  };

  // When
  await renderRouter(compactRoutes, { initialUrl: "/compact" });

  // Then
  expect(screen.getByRole("header", { name: "Équipe" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Retour" })).toBeOnTheScreen();
});

it.each(["start", "center"] as const)(
  "presents the title and subtitle as one accessible %s heading",
  async (titleAlignment) => {
    // Given
    const contextualRoutes = {
      ...routes,
      detail: () => (
        <PageHeader
          title="Levallois Paris Saint-Cloud"
          subtitle="Ligue A féminine"
          titleAlignment={titleAlignment}
          titleArtwork={<Text accessibilityRole="image">Écusson</Text>}
        />
      ),
    };

    // When
    await renderRouter(contextualRoutes, { initialUrl: "/detail" });

    // Then
    expect(
      screen.getByRole("header", {
        name: "Levallois Paris Saint-Cloud, Ligue A féminine",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ligue A féminine")).toBeOnTheScreen();
    expect(screen.queryByRole("image")).not.toBeOnTheScreen();
  },
);

import { screen, userEvent } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { PublicAccountLinks } from "../components/public-account-links";
import { useLocalSearchParams } from "expo-router";

it.each(["Conditions d’utilisation", "Politique de confidentialité"])(
  "keeps the unavailable legal document disabled without a fictitious destination: %s",
  async (label) => {
    // Given: legal publication is not delivered; the real Router owns only this existing account page.
    await renderRouter(
      { index: PublicAccountLinks },
      {
        initialUrl: "/",
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      },
    );
    const user = userEvent.setup();
    const legal = screen.getByRole("link", { name: label });

    // When
    await user.press(legal);

    // Then
    expect(legal).toBeDisabled();
    expect(screen).toHavePathname("/");
  },
);

it("opens the existing support destination through its public link", async () => {
  // Given
  await renderRouter(
    {
      index: PublicAccountLinks,
      support: () => <Text>Assistance</Text>,
    },
    {
      initialUrl: "/",
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    },
  );
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("link", { name: "Besoin d’aide ?" }));

  // Then
  expect(await screen.findByText("Assistance")).toBeOnTheScreen();
  expect(screen).toHavePathname("/support");
});

it("passes only the safe failed-sign-in origin through the shared support link", async () => {
  // Given
  await renderRouter(
    {
      index: () => (
        <PublicAccountLinks
          supportOrigin={{
            screen: "sign-in",
            failureStage: "authentication",
            failureReason: "unavailable",
          }}
        />
      ),
      support: SupportOriginProbe,
    },
    {
      initialUrl: "/",
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    },
  );
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("link", { name: "Besoin d’aide ?" }));

  // Then
  expect(
    await screen.findByText("sign-in / authentication / unavailable"),
  ).toBeOnTheScreen();
});

/** The destination observes actual Router URL parameters rather than Link implementation props. */
function SupportOriginProbe() {
  const params = useLocalSearchParams();
  return (
    <Text>
      {params.originScreen} / {params.failureStage} / {params.failureReason}
    </Text>
  );
}

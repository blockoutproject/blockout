import { screen, userEvent } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { PublicAccountLinks } from "../components/public-account-links";
import { useLocalSearchParams } from "expo-router";

it.each([
  ["Conditions d’utilisation", "Conditions"],
  ["Confidentialité", "Confidentialité ouverte"],
  ["Besoin d’aide ?", "Assistance"],
])(
  "opens the public destination through its named link: %s",
  async (label, destination) => {
    // Given: the real Router and link composition resolve local destination probes.
    await renderRouter(
      {
        index: PublicAccountLinks,
        "legals/terms": () => <Text>Conditions</Text>,
        "legals/privacy": () => <Text>Confidentialité ouverte</Text>,
        support: () => <Text>Assistance</Text>,
      },
      {
        initialUrl: "/",
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
      },
    );
    const user = userEvent.setup();

    // When
    await user.press(screen.getByRole("link", { name: label }));

    // Then
    expect(await screen.findByText(destination)).toBeOnTheScreen();
  },
);

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

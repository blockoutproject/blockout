import { screen, userEvent } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { PublicAccountLinks } from "../components/public-account-links";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import type { PropsWithChildren } from "react";

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(async () => ({ type: "cancel" })),
  WebBrowserResultType: { LOCKED: "locked" },
}));

/** Existing public links use the same theme and event feedback owners as the application root. */
function Owners({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="guest">
        {children}
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});
afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

it.each([
  ["Conditions d’utilisation", "terms"],
  ["Politique de confidentialité", "privacy"],
])(
  "opens the public native browser from the existing footer: %s",
  async (label, kind) => {
    // Given: the real Router owns the existing account page, not a custom document reader.
    await renderRouter(
      { index: PublicAccountLinks },
      {
        initialUrl: "/",
        wrapper: Owners,
      },
    );
    const user = userEvent.setup();
    const legal = screen.getByRole("link", { name: label });

    // When
    await user.press(legal);

    // Then
    expect(legal).toBeEnabled();
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      `https://api.example.invalid/legals/${kind}`,
    );
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
      wrapper: Owners,
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
      wrapper: Owners,
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

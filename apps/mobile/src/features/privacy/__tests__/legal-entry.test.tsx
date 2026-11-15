import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { ProfileLegalLinks } from "@/features/accounts/components/public-account-links";
import { ActionFeedbackProvider } from "@/shared/components/action-feedback";
import { ThemeProvider } from "@/shared/theme/theme-provider";

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserResultType: { CANCEL: "cancel", LOCKED: "locked" },
}));

const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  jest.mocked(WebBrowser.openBrowserAsync).mockReset().mockResolvedValue({
    type: WebBrowser.WebBrowserResultType.CANCEL,
  });
});

afterEach(async () => {
  await cleanup();
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

/** Keeps the legal actions and their actual theme/feedback owners; only native browser I/O is controlled. */
async function openEntries() {
  return render(
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="test">
        <ProfileLegalLinks />
      </ActionFeedbackProvider>
    </ThemeProvider>,
  );
}

it.each([
  ["Mentions légales", "imprint"],
  ["Conditions d’utilisation", "terms"],
  ["Politique de confidentialité", "privacy"],
])("opens the profile's %s document", async (label, kind) => {
  // Given
  await openEntries();
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("link", { name: label }));

  // Then
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
    `https://api.example.invalid/legals/${kind}`,
  );
});

it("shows safe opening failure and retries only when the existing link is pressed again", async () => {
  // Given
  jest
    .mocked(WebBrowser.openBrowserAsync)
    .mockRejectedValueOnce(new Error("Private native payload"));
  await openEntries();
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("link", { name: "Mentions légales" }));

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Impossible d’ouvrir ce document. Réessayez.",
  );
  expect(screen.queryByText("Private native payload")).toBeNull();
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(1);

  // When
  await user.press(screen.getByRole("link", { name: "Mentions légales" }));

  // Then
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).toBeNull();
});

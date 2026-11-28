import * as WebBrowser from "expo-web-browser";
import { openLegalDocument } from "../open-legal-document";

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserResultType: {
    CANCEL: "cancel",
    LOCKED: "locked",
  },
}));
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  jest.mocked(WebBrowser.openBrowserAsync).mockReset().mockResolvedValue({
    type: WebBrowser.WebBrowserResultType.CANCEL,
  });
});
afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

it("reports a locked native presentation as an opening failure", async () => {
  // Given
  jest.mocked(WebBrowser.openBrowserAsync).mockResolvedValue({
    type: WebBrowser.WebBrowserResultType.LOCKED,
  });

  // When / Then
  await expect(openLegalDocument("imprint")).rejects.toThrow();
});

it.each([
  "",
  "ftp://api.example.invalid",
  "https://user:password@api.example.invalid",
])(
  "rejects unusable backend configuration %s before native opening",
  async (base) => {
    // Given
    process.env.EXPO_PUBLIC_API_URL = base;

    // When / Then
    await expect(openLegalDocument("privacy")).rejects.toThrow();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  },
);

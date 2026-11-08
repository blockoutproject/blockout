import * as WebBrowser from "expo-web-browser";
import { openLegalDocument } from "../open-legal-document";

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserResultType: {
    CANCEL: "cancel",
    DISMISS: "dismiss",
    OPENED: "opened",
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

it.each(["imprint", "privacy", "terms"] as const)(
  "opens the stable public %s URL without credentials or a custom reader",
  async (kind) => {
    // Given: the configured backend also serves public legal HTML.

    // When
    await openLegalDocument(kind);

    // Then
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      `https://api.example.invalid/legals/${kind}`,
    );
  },
);

it.each([
  WebBrowser.WebBrowserResultType.CANCEL,
  WebBrowser.WebBrowserResultType.DISMISS,
  WebBrowser.WebBrowserResultType.OPENED,
])(
  "leaves native %s return without interpreting it as acceptance",
  async (type) => {
    // Given: iOS resolves on return; Android resolves when Custom Tabs opens.
    jest.mocked(WebBrowser.openBrowserAsync).mockResolvedValue({ type });

    // When / Then
    await expect(openLegalDocument("privacy")).resolves.toBeUndefined();
  },
);

it("propagates opening failure and opens again only on explicit retry", async () => {
  // Given
  jest
    .mocked(WebBrowser.openBrowserAsync)
    .mockRejectedValueOnce(new Error("Native browser unavailable"));

  // When / Then
  await expect(openLegalDocument("terms")).rejects.toThrow();
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(1);

  // When
  await openLegalDocument("terms");

  // Then
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(2);
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

import * as WebBrowser from "expo-web-browser";

/** Stable repository-backed document types; reading creates no acceptance or advertising event. */
export type LegalDocument = "imprint" | "privacy" | "terms";

/**
 * Opens public HTML with the native integrated browser, without session credentials.
 * iOS resolves on return and Android on opening; neither result establishes successful reading.
 * Native opening/configuration failures reject for the caller's explicit retry. HTTP and network
 * failures after opening remain with the browser's ordinary controls.
 */
export async function openLegalDocument(
  document: LegalDocument,
): Promise<void> {
  const base = new URL(process.env.EXPO_PUBLIC_API_URL ?? "");
  if (
    !["https:", "http:"].includes(base.protocol) ||
    base.username ||
    base.password
  ) {
    throw new Error("Invalid legal document origin");
  }
  const destination = new URL(`/legals/${document}`, base);
  const result = await WebBrowser.openBrowserAsync(destination.href);
  if (result.type === WebBrowser.WebBrowserResultType.LOCKED) {
    throw new Error("Native browser is already presenting");
  }
}

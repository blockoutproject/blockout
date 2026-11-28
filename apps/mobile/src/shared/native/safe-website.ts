/** Returns the original HTTP(S) address if it parses without credentials. */
export function safeWebsite(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

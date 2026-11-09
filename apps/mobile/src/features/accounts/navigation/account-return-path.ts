/**
 * Accepts one internal return URL while rejecting external origins and a loop back into sign-in.
 * URL normalization handles dot segments; decoded Router groups are ignored only for the loop check.
 * The accepted path retains its groups, query and fragment.
 * Unknown, repeated or malformed route parameters leave the ordinary Profile fallback to the caller.
 */
export function accountReturnPath(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return undefined;
  }
  try {
    const destination = new URL(value, "https://blockout.invalid");
    const route = decodeURIComponent(destination.pathname)
      .split("/")
      .filter(
        (segment) =>
          segment && !(segment.startsWith("(") && segment.endsWith(")")),
      )
      .join("/");
    if (
      destination.origin !== "https://blockout.invalid" ||
      route === "sign-in"
    ) {
      return undefined;
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return undefined;
  }
}

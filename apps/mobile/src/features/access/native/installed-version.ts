import { nativeApplicationVersion } from "expo-application";

/** Accepts exactly three decimal safe integers, without leading zeros, whitespace or suffixes. */
export function parsePublishedVersion(
  value: string | null,
): number[] | undefined {
  if (
    value === null ||
    !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(value) ||
    value.trim() !== value
  )
    return undefined;
  const components = value.split(".").map(Number);
  return components.every(Number.isSafeInteger) ? components : undefined;
}

/** Compares the native published version only when a platform minimum actually applies. */
export function installedVersionStatus(
  minimum: string | null,
  installed: string | null = nativeApplicationVersion,
): "satisfied" | "outdated" | "unavailable" {
  if (minimum === null) return "satisfied";
  const required = parsePublishedVersion(minimum);
  const actual = parsePublishedVersion(installed);
  if (!required || !actual) return "unavailable";
  for (let index = 0; index < 3; index++) {
    if (actual[index] < required[index]) return "outdated";
    if (actual[index] > required[index]) return "satisfied";
  }
  return "satisfied";
}

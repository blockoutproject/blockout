const compactTimestamp: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

/** Formats an established collection instant in the current device zone for operator feedback. */
export function formatCollectionTimestamp(
  instant: string,
  format?: "compact",
): string {
  return new Date(instant).toLocaleString(
    "fr-FR",
    format === "compact" ? compactTimestamp : undefined,
  );
}

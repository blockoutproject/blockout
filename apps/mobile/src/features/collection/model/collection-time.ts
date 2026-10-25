/** Formats an established collection instant in the current device zone for operator feedback. */
export function formatCollectionTimestamp(instant: string): string {
  return new Date(instant).toLocaleString("fr-FR");
}

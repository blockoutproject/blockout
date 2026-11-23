export const collectionClubFamilyLabels = {
  "club-sheets": "Fiches clubs",
  geocoding: "Géocodage",
} as const;

export type ClubCollectionFamily = keyof typeof collectionClubFamilyLabels;

export function isClubCollectionFamily(
  value: unknown,
): value is ClubCollectionFamily {
  return (
    typeof value === "string" &&
    Object.hasOwn(collectionClubFamilyLabels, value)
  );
}

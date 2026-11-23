export const collectionClubFamilyLabels = {
  "club-sheets": "Fiches clubs",
  geocoding: "Géocodage",
} as const;

export type ClubCollectionFamily = keyof typeof collectionClubFamilyLabels;

export function collectionClubFamilyFromRoute(value: unknown) {
  return value === "club-sheets" || value === "geocoding" ? value : undefined;
}

import type { PoolResponse } from "@/src/shared/generated/models";
import {
  type EntityPillPalette,
  type EntityPillPresentation,
  toGenderPillPresentation,
  toNeutralPillPresentation,
} from "@/src/shared/model/entity-pill-presentation";

export type PoolProfilePresentation = {
  gradient: readonly [string, string, string];
  imageUri?: string | null;
  pills: EntityPillPresentation[];
};

export const toPoolProfilePresentation = (
  pool: PoolResponse,
  palette: EntityPillPalette,
): PoolProfilePresentation => ({
  gradient: [
    pool.division.firstGradientColor,
    pool.division.secondGradientColor,
    pool.division.thirdGradientColor,
  ],
  imageUri: pool.division.logoUrl,
  pills: [
    ...(pool.leagueName
      ? [toNeutralPillPresentation(pool.leagueName, palette)]
      : []),
    ...(pool.division.name
      ? [
          {
            label: pool.division.name,
            color: pool.division.mainColor ?? palette.mixed,
          },
        ]
      : []),
    ...(pool.gender ? [toGenderPillPresentation(pool.gender, palette)] : []),
    ...(pool.season ? [toNeutralPillPresentation(pool.season, palette)] : []),
  ],
});

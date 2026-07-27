import type { PoolSummaryResponse } from "@/src/shared/generated/models";
import type {
  EntityCardPalette,
  EntityCardPresentation,
} from "@/src/shared/ui/entity/entity-card";
import { FormatLabels } from "@/src/shared/view-models/format-labels";
import {
  GenderEnum,
  GenderLabels,
} from "@/src/shared/view-models/gender-labels";
import { isRegional } from "@/src/shared/view-models/league";

const genderColor = (
  gender: GenderEnum,
  palette: EntityCardPalette,
): string => {
  switch (gender) {
    case GenderEnum.M:
      return palette.male;
    case GenderEnum.F:
      return palette.female;
    case GenderEnum.O:
    default:
      return palette.mixed;
  }
};

export const toPoolCardPresentation = (
  pool: PoolSummaryResponse,
  palette: EntityCardPalette,
): EntityCardPresentation => ({
  title: pool.name,
  imageUri: pool.division.logoUrl,
  gradient: [
    pool.division.firstGradientColor,
    pool.division.secondGradientColor,
    pool.division.thirdGradientColor,
  ],
  metadata: [
    {
      label: pool.division.name,
      color: pool.division.mainColor,
    },
    ...(isRegional(pool.leagueCode) && pool.leagueName
      ? [{ label: pool.leagueName, color: palette.neutral }]
      : []),
    {
      label: GenderLabels[pool.gender],
      color: genderColor(pool.gender, palette),
    },
    {
      label: pool.season,
      color: palette.neutral,
    },
    {
      label: FormatLabels[pool.format],
      color: palette.neutral,
    },
  ].filter((item) => Boolean(item.label)),
});

import type { TeamSummaryResponse } from "@/src/shared/generated/models";
import type {
  EntityCardPalette,
  EntityCardPresentation,
} from "@/src/shared/ui/entity/entity-card";
import { FormatLabels } from "@/src/shared/view-models/format-labels";
import {
  GenderEnum,
  GenderLabels,
} from "@/src/shared/view-models/gender-labels";

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

export const toTeamCardPresentation = (
  team: TeamSummaryResponse,
  palette: EntityCardPalette,
): EntityCardPresentation => ({
  title: team.shortName || team.name,
  imageUri: team.logoUrl,
  gradient: [
    team.division.firstGradientColor,
    team.division.secondGradientColor,
    team.division.thirdGradientColor,
  ],
  metadata: [
    {
      label: team.division.name,
      color: team.division.mainColor,
    },
    {
      label: GenderLabels[team.gender],
      color: genderColor(team.gender, palette),
    },
    {
      label: team.season,
      color: palette.neutral,
    },
    {
      label: FormatLabels[team.format],
      color: palette.neutral,
    },
  ].filter((item) => Boolean(item.label)),
});

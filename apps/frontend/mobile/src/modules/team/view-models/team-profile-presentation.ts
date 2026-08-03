import type { TeamResponse } from "@/src/shared/generated/models";
import { FormatLabels } from "@/src/shared/view-models/format-labels";
import {
  type EntityPillPalette,
  type EntityPillPresentation,
  toGenderPillPresentation,
  toNeutralPillPresentation,
} from "@/src/shared/model/entity-pill-presentation";

export type TeamProfilePresentation = {
  clubId: string;
  gradient: readonly [string, string, string];
  imageUri?: string | null;
  pills: EntityPillPresentation[];
};

export const toTeamProfilePresentation = (
  team: TeamResponse,
  palette: EntityPillPalette,
): TeamProfilePresentation => ({
  clubId: team.clubId,
  gradient: [
    team.division.firstGradientColor,
    team.division.secondGradientColor,
    team.division.thirdGradientColor,
  ],
  imageUri: team.logoUrl,
  pills: [
    ...(team.division.name
      ? [
          {
            label: team.division.name,
            color: team.division.mainColor ?? palette.mixed,
          },
        ]
      : []),
    ...(team.gender ? [toGenderPillPresentation(team.gender, palette)] : []),
    ...(team.format
      ? [toNeutralPillPresentation(FormatLabels[team.format], palette)]
      : []),
    ...(team.season ? [toNeutralPillPresentation(team.season, palette)] : []),
  ],
});

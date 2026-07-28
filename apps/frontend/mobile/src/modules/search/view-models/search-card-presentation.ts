import type {
  ClubSearchResponse,
  PoolSearchResponse,
  TeamSearchResponse,
} from "@/src/shared/generated/models";
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

export const toSearchTeamCardPresentation = (
  team: TeamSearchResponse,
  palette: EntityCardPalette,
): EntityCardPresentation => ({
  title: team.name,
  imageUri: team.logoUrl,
  metadata: [
    { label: team.divisionName, color: palette.neutral },
    {
      label: GenderLabels[team.gender],
      color: genderColor(team.gender, palette),
    },
    { label: team.season, color: palette.neutral },
    { label: FormatLabels[team.format], color: palette.neutral },
  ].filter((item) => Boolean(item.label)),
});

export const toSearchPoolCardPresentation = (
  pool: PoolSearchResponse,
  palette: EntityCardPalette,
): EntityCardPresentation => ({
  title: pool.name,
  imageUri: pool.logoUrl,
  metadata: [
    { label: pool.divisionName, color: palette.neutral },
    ...(isRegional(pool.leagueCode) && pool.leagueName
      ? [{ label: pool.leagueName, color: palette.neutral }]
      : []),
    {
      label: GenderLabels[pool.gender],
      color: genderColor(pool.gender, palette),
    },
    { label: pool.season, color: palette.neutral },
    { label: FormatLabels[pool.format], color: palette.neutral },
  ].filter((item) => Boolean(item.label)),
});

export const toSearchClubCardPresentation = (
  club: ClubSearchResponse,
  palette: EntityCardPalette,
): EntityCardPresentation => ({
  title: club.name,
  imageUri: club.logoUrl,
  metadata: club.city
    ? [{ label: club.city, icon: "map-marker", color: palette.neutral }]
    : [],
});

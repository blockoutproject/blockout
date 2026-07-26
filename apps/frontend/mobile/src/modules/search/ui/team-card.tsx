import React from "react";
import { spacing, useAppTheme } from "@/src/shared/theme";
import type { TeamSearchResponse } from "@/src/shared/generated/models";
import { GenderEnum, GenderLabels } from "@/src/shared/model/gender-labels";
import { withAlpha } from "@/src/shared/lib/utils";
import EntityGradientCard, {
  EntityCardChip,
} from "@/src/shared/ui/entity-gradient-card";
import { FormatEnum, FormatLabels } from "@/src/shared/model/format-labels";

export interface TeamCardProps {
  team: TeamSearchResponse;
  onPress: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onPress }) => {
  const theme = useAppTheme();

  const chips: EntityCardChip[] = [];

  if (team.divisionName) {
    chips.push({
      label: team.divisionName,
      borderColor: theme.textInactive,
      backgroundColor: withAlpha(theme.textInactive, 0.12),
    });
  }

  if (team.gender) {
    let genderColor: string;
    switch (team.gender) {
      case GenderEnum.M:
        genderColor = theme.male;
        break;
      case GenderEnum.F:
        genderColor = theme.female;
        break;
      case GenderEnum.O:
      default:
        genderColor = theme.textSecondary;
        break;
    }

    chips.push({
      label: GenderLabels[team.gender as GenderEnum],
      borderColor: genderColor,
      backgroundColor: withAlpha(genderColor, 0.12),
    });
  }

  if (team.season) {
    chips.push({
      label: team.season,
      borderColor: theme.textInactive,
      backgroundColor: withAlpha(theme.textInactive, 0.12),
    });
  }

  if (team.format) {
    chips.push({
      label: FormatLabels[team.format as FormatEnum],
      borderColor: theme.textInactive,
      backgroundColor: withAlpha(theme.textInactive, 0.12),
    });
  }

  return (
    <EntityGradientCard
      title={team.name}
      imageUri={team.logoUrl}
      chips={chips}
      onPress={onPress}
      testID={`search-team-item-${team.id}`}
      marginBottom={spacing[3]}
      minHeight={90}
    />
  );
};

export default TeamCard;

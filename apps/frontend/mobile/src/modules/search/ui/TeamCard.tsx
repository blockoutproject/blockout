import React from "react";
import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import type { TeamSearchResponse } from "@/src/modules/search/model/Search";
import { EnumGender, GenderLabels } from "@/src/shared/model/enums/Gender";
import { withAlpha } from "@/src/shared/lib/utils";
import EntityGradientCard, {
  EntityCardChip,
} from "@/src/shared/ui/EntityGradientCard";
import { EnumFormat, FormatLabels } from "@/src/shared/model/enums/Format";

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
      case EnumGender.M:
        genderColor = theme.male;
        break;
      case EnumGender.F:
        genderColor = theme.female;
        break;
      case EnumGender.O:
      default:
        genderColor = theme.textSecondary;
        break;
    }

    chips.push({
      label: GenderLabels[team.gender as EnumGender],
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
      label: FormatLabels[team.format as EnumFormat],
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
      marginBottom={12}
      allowChipWrap
    />
  );
};

export default TeamCard;

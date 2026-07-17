import React from 'react';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { TeamSearchDocDTO } from '@/src/types/Team';
import { EnumGender, GenderLabels } from '@/src/types/enums/Gender';
import { withAlpha } from '@/src/utils/utils';
import EntityGradientCard, {
  EntityCardChip,
} from '../common/EntityGradientCard';
import { EnumFormat, FormatLabels } from '@/src/types/enums/Format';

export interface TeamCardProps {
  team: TeamSearchDocDTO;
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
      title={team.name ?? ''}
      imageUri={team.logoUrl}
      chips={chips}
      onPress={onPress}
      testID="team-card"
      marginBottom={12}
      allowChipWrap
    />
  );
};

export default TeamCard;

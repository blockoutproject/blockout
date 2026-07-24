import React from "react";
import { radius, spacing, useAppTheme } from "@/src/shared/theme";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";
import { GenderEnum, GenderLabels } from "@/src/shared/model/genderLabels";
import { FormatLabels } from "@/src/shared/model/formatLabels";
import { withAlpha } from "@/src/shared/lib/utils";
import EntityGradientCard, {
  EntityCardChip,
} from "@/src/shared/ui/entity-gradient-card";

export type TeamListCardProps = {
  team: TeamSummaryResponse;
  onPress: () => void;
  testID?: string;
  logoSize?: number;
  borderRadius?: number;
  padding?: number;
  marginBottom?: number;
};

const TeamListCard: React.FC<TeamListCardProps> = ({
  team,
  onPress,
  testID,
  logoSize = 44,
  borderRadius = radius.lg,
  padding = spacing[3],
  marginBottom = spacing[3],
}) => {
  const theme = useAppTheme();

  const title = team.shortName || team.name;
  const division = team.division;
  const gradient = [
    division.firstGradientColor,
    division.secondGradientColor,
    division.thirdGradientColor,
  ] as const;

  const chips: EntityCardChip[] = [];

  if (team.division?.name) {
    chips.push({
      label: team.division.name,
      borderColor: team.division.mainColor,
      backgroundColor: withAlpha(team.division.mainColor, 0.12),
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
      label: GenderLabels[team.gender],
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
      label: FormatLabels[team.format],
      borderColor: theme.textInactive,
      backgroundColor: withAlpha(theme.textInactive, 0.12),
    });
  }

  return (
    <EntityGradientCard
      title={title}
      imageUri={team.logoUrl}
      chips={chips}
      onPress={onPress}
      testID={testID}
      logoSize={logoSize}
      borderRadius={borderRadius}
      padding={padding}
      marginBottom={marginBottom}
      gradient={gradient}
    />
  );
};

export default TeamListCard;

import React from "react";
import { useAppTheme } from "@/src/shared/theme";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";
import EntityCard from "@/src/shared/ui/entity/entity-card";
import { toTeamCardPresentation } from "@/src/modules/team/view-models/team-card-presentation";

export type TeamListCardProps = {
  team: TeamSummaryResponse;
  onPress: () => void;
  testID?: string;
};

const TeamListCard: React.FC<TeamListCardProps> = ({
  team,
  onPress,
  testID,
}) => {
  const theme = useAppTheme();
  const presentation = toTeamCardPresentation(team, {
    neutral: theme.textInactive,
    male: theme.male,
    female: theme.female,
    mixed: theme.textSecondary,
  });

  return (
    <EntityCard presentation={presentation} onPress={onPress} testID={testID} />
  );
};

export default TeamListCard;

import React from "react";
import { useAppTheme } from "@/src/shared/theme";
import type { TeamSearchResponse } from "@/src/shared/generated/models";
import EntityCard from "@/src/shared/ui/entity/entity-card";
import { toSearchTeamCardPresentation } from "@/src/modules/search/view-models/search-card-presentation";

export interface TeamCardProps {
  team: TeamSearchResponse;
  onPress: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onPress }) => {
  const theme = useAppTheme();
  const presentation = toSearchTeamCardPresentation(team, {
    neutral: theme.textInactive,
    male: theme.male,
    female: theme.female,
    mixed: theme.textSecondary,
  });

  return (
    <EntityCard
      presentation={presentation}
      onPress={onPress}
      testID={`search-team-item-${team.id}`}
    />
  );
};

export default TeamCard;

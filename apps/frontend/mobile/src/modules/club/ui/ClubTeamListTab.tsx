import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import {useAppTheme} from "@/src/shared/theme";
import ClubTeamList from "@/src/modules/club/ui/ClubTeamList";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";

type Props = {
  teams: TeamSummaryResponse[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => Promise<unknown>;
  scrollY: Animated.Value;
};

const ClubTeamListTab: React.FC<Props> = ({
  teams,
  isLoading,
  isError,
  onRefresh,
  scrollY,
}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ClubTeamList
        teams={teams}
        isLoading={isLoading}
        isError={isError}
        onRefresh={onRefresh}
        scrollY={scrollY}
      />
    </View>
  );
};

export default ClubTeamListTab;

const styles = StyleSheet.create({
  container: { flex: 1 },
});

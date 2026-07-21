import React from "react";
import {Animated, StyleSheet, View} from "react-native";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import ClubTeamList from "@/src/components/club/ClubTeamList";
import type {TeamSummaryResponse} from "@/src/modules/team/model/Team";

type Props = {
  clubId: string;
  teams: TeamSummaryResponse[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => Promise<any>;
  scrollY: Animated.Value;
};

const ClubTeamListTab: React.FC<Props> = ({clubId, teams, isLoading, isError, onRefresh, scrollY}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ClubTeamList
        clubId={clubId}
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
  container: {flex: 1},
});

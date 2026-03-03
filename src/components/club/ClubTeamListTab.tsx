import React from "react";
import { StyleSheet, View, Animated } from "react-native";

import { useAppTheme } from "@/src/context/ThemeProvider";
import ClubTeamList from "@/src/components/club/ClubTeamList";
import { TeamSummaryDTO } from "@/src/types/Team";

type Props = {
    clubId: string;
    teams: TeamSummaryDTO[];
    isLoading: boolean;
    isError: boolean;
    onRefresh: () => Promise<any>;
    scrollY: Animated.Value;
};

const ClubTeamListTab: React.FC<Props> = ({ clubId, teams, isLoading, isError, onRefresh, scrollY }) => {
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
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
    container: { flex: 1 },
});
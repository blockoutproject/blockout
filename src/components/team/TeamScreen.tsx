import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamTabs from "./components/TeamTabs";
import TeamProfile from "./components/TeamProfile";
import { useEnrichedTeamById } from "@/src/hooks/team/useEnrichedTeamById";
import TeamStatsCard from "./components/TeamStatsCard";
import TeamSkeleton from "./components/TeamSkeleton";
import { BottomSheetView } from "@gorhom/bottom-sheet";

type Props = {
    teamId: number;
};

const TeamScreen: React.FC<Props> = ({ teamId }) => {
    const { data: enrichedTeam, isLoading, isError } = useEnrichedTeamById(teamId);
    const theme = useAppTheme();


    return (
        <BottomSheetView style={[styles.container, { backgroundColor: theme.background }]}>
            {isLoading || !enrichedTeam ? (
                <TeamSkeleton />
            ) : (
                <>
                    <TeamProfile enrichedTeam={enrichedTeam} />
                    <TeamTabs enrichedTeam={enrichedTeam} />
                </>
            )}
        </BottomSheetView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default TeamScreen;
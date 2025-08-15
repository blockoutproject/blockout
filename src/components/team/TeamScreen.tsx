import React from "react";
import { StyleSheet, View } from "react-native";
import { useEnrichedTeamById } from "@/src/hooks/team/useEnrichedTeamById";
import TeamSkeleton from "@/src/components/team/components/TeamSkeleton";
import TeamProfile from "@/src/components/team/components/TeamProfile";
import TeamTabs from "@/src/components/team/components/TeamTabs";
import { RouteProp, useRoute } from "@react-navigation/native";
import { SheetStackParamList } from "@/src/components/common/BottomSheetNavigator";
import ErrorState from "@/src/components/common/ErrorState";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamHeader from "@/src/components/team/components/TeamHeader";

type TeamRouteProp = RouteProp<SheetStackParamList, "Team">;

type TeamScreenProps = {
    onCloseSheet: () => void;
};

const TeamScreen: React.FC<TeamScreenProps> = ({ onCloseSheet }) => {
    const theme = useAppTheme();
    const { params } = useRoute<TeamRouteProp>();
    const teamId = params.teamId;
    const { data: team, isLoading, error, refetch } = useEnrichedTeamById(teamId);

    let body: React.ReactNode;
    if (isLoading) {
        body = <TeamSkeleton />;
    } else if (error) {
        body = <ErrorState message="Impossible de charger l'équipe." onRetry={refetch} />;
    } else if (!team) {
        body = <ErrorState message="Cette équipe est introuvable." onRetry={refetch} />;
    } else {
        body = (
            <>
                <TeamProfile enrichedTeam={team} />
                <TeamTabs enrichedTeam={team} />
            </>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <TeamHeader title={team?.name} onCloseSheet={onCloseSheet} />
            {body}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
});

export default TeamScreen;
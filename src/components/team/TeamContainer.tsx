import React from "react";
import { StyleSheet, Text } from "react-native";
import { useTeamById } from "@/src/hooks/team/useTeamById";
import { useDetailedPoolsByTeam } from "@/src/hooks/pool/useDetailedPoolsByTeam";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamProfile from "@/src/components/team/TeamProfile";
import TeamTabs from "@/src/components/team/TeamTabs";

type Props = {
    teamId: number;
};

const TeamContainer: React.FC<Props> = ({ teamId }) => {
    const { data: team, isLoading: isTeamLoading, isError: isTeamError } = useTeamById(teamId);
    const { pools, isLoading: isPoolsLoading, isError: isPoolsError } = useDetailedPoolsByTeam(teamId);
    const theme = useAppTheme();

    const isLoading = isTeamLoading || isPoolsLoading;
    const isError = isTeamError || isPoolsError;

    if (isLoading) {
        return <Text style={{ color: theme.text, padding: 16 }}>Chargement...</Text>;
    }

    if (isError) {
        return <Text style={{ color: theme.error, padding: 16 }}>Erreur de chargement</Text>;
    }

    return (
        <>
            <TeamProfile team={team!} />
            <TeamTabs pools={pools!} team={team!} />
        </>
    );
};

export default TeamContainer;

const styles = StyleSheet.create({

});
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";

import { useEnrichedTeamById } from "@/src/hooks/team/useEnrichedTeamById";
import TeamSkeleton from "@/src/components/team/TeamSkeleton";
import TeamProfile from "@/src/components/team/TeamProfile";
import TeamTabs from "@/src/components/team/TeamTabs";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamHeader from "@/src/components/team/TeamHeader";
import { ReportType } from "@/src/types/Report";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";

const TeamScreen: React.FC = () => {
    const theme = useAppTheme();
    const { id } = useLocalSearchParams();
    const { data: team, isLoading, error, refetch } = useEnrichedTeamById(Number(id));

    const reportSheetRef = useRef<BottomSheetModal>(null);

    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    const body = useMemo(() => {
        if (isLoading) {
            return (
                <TeamSkeleton />
            );
        }
        if (error) {
            return (
                <ErrorState
                    subtitle="Impossible de charger l'équipe."
                    onRetry={refetch}
                    paddingTop={"40%"}
                />
            );
        }
        if (!team) {
            return (
                <ErrorState
                    subtitle="Cette équipe est introuvable."
                    onRetry={refetch}
                    paddingTop={"40%"}
                />
            );
        }
        return (
            <>
                <TeamProfile enrichedTeam={team} />
                <TeamTabs enrichedTeam={team} />
            </>
        );
    }, [isLoading, error, team, refetch]);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.background,
                },
            ]}
            testID="team-screen"
        >
            <TeamHeader
                title={team?.name}
                onOpenReport={handleOpenReport}
            />

            {body}

            <ReportFormSheet
                ref={reportSheetRef}
                context={{ screen: "Team", defaultType: ReportType.DISPLAY_BUG }}
                onSuccess={() => {
                    reportSheetRef.current?.dismiss();
                }}
                snapPoint="90%"
                footerLabel="Envoyer"
            />
        </View>
    );
};

export default TeamScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
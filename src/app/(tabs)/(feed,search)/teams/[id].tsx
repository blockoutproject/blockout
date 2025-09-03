// src/screens/team/TeamScreen.tsx
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";

import { useEnrichedTeamById } from "@/src/hooks/team/useEnrichedTeamById";
import TeamSkeleton from "@/src/components/team/components/TeamSkeleton";
import TeamProfile from "@/src/components/team/components/TeamProfile";
import TeamTabs from "@/src/components/team/components/TeamTabs";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import { useAppTheme } from "@/src/context/ThemeProvider";
import TeamHeader from "@/src/components/team/components/TeamHeader";
import BottomSheetCustomModal from "@/src/components/common/BottomSheetCustomModal";
import ReportForm from "@/src/components/report/ReportForm";
import { ReportType } from "@/src/types/Report";

const TeamScreen: React.FC = () => {
    const theme = useAppTheme();
    const { id } = useLocalSearchParams();
    const { data: team, isLoading, error, refetch } = useEnrichedTeamById(Number(id));

    const reportSheetRef = useRef<BottomSheetModal>(null);

    // Handlers stables
    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    const handleCloseReport = useCallback(() => {
        reportSheetRef.current?.dismiss();
    }, []);

    // Rendu principal mémoïsé (évite recréations inutiles)
    const body = useMemo(() => {
        if (isLoading) {
            return <TeamSkeleton />;
        }
        if (error) {
            return (
                <ErrorState
                    subtitle="Impossible de charger l'équipe."
                    onRetry={refetch}
                    paddingTop="40%"
                />
            );
        }
        if (!team) {
            return (
                <ErrorState
                    subtitle="Cette équipe est introuvable."
                    onRetry={refetch}
                    paddingTop="40%"
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
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <TeamHeader title={team?.name} onOpenReport={handleOpenReport} />

            {body}

            <BottomSheetCustomModal ref={reportSheetRef} snapPoint="90%">
                <ReportForm
                    context={{ screen: "Team", defaultType: ReportType.DISPLAY_BUG }}
                    onSuccess={handleCloseReport}
                />
            </BottomSheetCustomModal>
        </View>
    );
};

export default TeamScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});
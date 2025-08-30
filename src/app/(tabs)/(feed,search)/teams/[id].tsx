import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

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
import { useLocalSearchParams } from "expo-router";


const TeamScreen: React.FC = () => {
    const theme = useAppTheme();
    const { id } = useLocalSearchParams();
    const { data: team, isLoading, error, refetch } = useEnrichedTeamById(Number(id));

    const reportSheetRef = useRef<BottomSheetModal>(null);

    let body: React.ReactNode;
    if (isLoading) {
        body = <TeamSkeleton />;
    } else if (error) {
        body = <ErrorState subtitle="Impossible de charger l'équipe." onRetry={refetch} />;
    } else if (!team) {
        body = <ErrorState subtitle="Cette équipe est introuvable." onRetry={refetch} />;
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
            <TeamHeader
                title={team?.name}
                onOpenReport={() => reportSheetRef.current?.present()}
            />
            {body}

            <BottomSheetCustomModal
                ref={reportSheetRef}
                snapPoint={"90%"}
            >
                <ReportForm
                    context={{
                        screen: "Team",
                        defaultType: ReportType.DISPLAY_BUG,
                    }}
                    onSuccess={() => {
                        reportSheetRef.current?.dismiss();
                    }}
                />
            </BottomSheetCustomModal>
        </View>
    );
};

export default TeamScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});
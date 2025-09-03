import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";

import { useEnrichedPoolById } from "@/src/hooks/pool/useEnrichedPoolById";
import PoolSkeleton from "@/src/components/pool/components/PoolSkeleton";
import PoolProfile from "@/src/components/pool/components/PoolProfile";
import PoolTabs from "@/src/components/pool/components/PoolTabs";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import { useAppTheme } from "@/src/context/ThemeProvider";
import PoolHeader from "@/src/components/pool/components/PoolHeader";
import BottomSheetCustomModal from "@/src/components/common/BottomSheetCustomModal";
import ReportForm from "@/src/components/report/ReportForm";
import { ReportType } from "@/src/types/Report";

const PoolScreen: React.FC = () => {
    const theme = useAppTheme();
    const { id } = useLocalSearchParams();
    const { data: enrichedPool, isLoading, error, refetch } = useEnrichedPoolById(Number(id));

    const reportSheetRef = useRef<BottomSheetModal>(null);

    // Handlers stabilisés
    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    const handleCloseReport = useCallback(() => {
        reportSheetRef.current?.dismiss();
    }, []);

    // Body mémoïsé
    const body = useMemo(() => {
        if (isLoading) {
            return <PoolSkeleton />;
        }
        if (error) {
            return (
                <ErrorState
                    subtitle="Impossible de charger la poule."
                    onRetry={refetch}
                    paddingTop="40%"
                />
            );
        }
        if (!enrichedPool) {
            return (
                <ErrorState
                    subtitle="Cette poule est introuvable."
                    onRetry={refetch}
                    paddingTop="40%"
                />
            );
        }

        return (
            <>
                <PoolProfile enrichedPool={enrichedPool} />
                <PoolTabs enrichedPool={enrichedPool} />
            </>
        );
    }, [isLoading, error, enrichedPool, refetch]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <PoolHeader title={enrichedPool?.name} onOpenReport={handleOpenReport} />

            {body}

            <BottomSheetCustomModal ref={reportSheetRef} snapPoint="90%">
                <ReportForm
                    context={{
                        screen: "Pool",
                        defaultType: ReportType.DISPLAY_BUG,
                    }}
                    onSuccess={handleCloseReport}
                />
            </BottomSheetCustomModal>
        </View>
    );
};

export default PoolScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});
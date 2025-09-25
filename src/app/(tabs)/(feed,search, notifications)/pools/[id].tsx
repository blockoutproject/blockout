import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";

import { useEnrichedPoolById } from "@/src/hooks/pool/useEnrichedPoolById";
import PoolSkeleton from "@/src/components/pool/PoolSkeleton";
import PoolProfile from "@/src/components/pool/PoolProfile";
import PoolTabs from "@/src/components/pool/PoolTabs";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import { useAppTheme } from "@/src/context/ThemeProvider";
import PoolHeader from "@/src/components/pool/PoolHeader";
import { ReportType } from "@/src/types/Report";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";

/** Pool root screen. */
const PoolScreen: React.FC = () => {
    const theme = useAppTheme();
    const { id } = useLocalSearchParams();
    const { data: enrichedPool, isLoading, error, refetch } = useEnrichedPoolById(Number(id));

    const reportSheetRef = useRef<BottomSheetModal>(null);

    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    const body = useMemo(() => {
        if (isLoading) {
            return (
                <PoolSkeleton />
            );
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
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.background,
                },
            ]}
            testID="pool-screen"
        >
            <PoolHeader
                title={enrichedPool?.name}
                onOpenReport={handleOpenReport}
            />

            {body}

            <ReportFormSheet
                ref={reportSheetRef}
                context={{ screen: "Pool", defaultType: ReportType.DISPLAY_BUG }}
                onSuccess={() => {
                    reportSheetRef.current?.dismiss();
                }}
                snapPoint="90%"
                footerLabel="Envoyer"
            />
        </View>
    );
};

export default PoolScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
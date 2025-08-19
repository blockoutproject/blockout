import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { useEnrichedPoolById } from "@/src/hooks/pool/useEnrichedPoolById";
import PoolSkeleton from "@/src/components/pool/components/PoolSkeleton";
import PoolProfile from "@/src/components/pool/components/PoolProfile";
import PoolTabs from "@/src/components/pool/components/PoolTabs";
import ErrorState from "@/src/components/common/ErrorState";
import { useAppTheme } from "@/src/context/ThemeProvider";
import PoolHeader from "@/src/components/pool/components/PoolHeader";
import { SheetStackParamList } from "@/src/components/common/BottomSheetNavigator";
import BottomSheetCustomModal from "@/src/components/common/BottomSheetCustomModal";
import ReportForm from "@/src/components/report/ReportForm";
import { ReportType } from "@/src/types/Report";

type PoolRouteProp = RouteProp<SheetStackParamList, "Pool">;

type PoolScreenProps = {
    onCloseSheet: () => void;
};

const PoolScreen: React.FC<PoolScreenProps> = ({ onCloseSheet }) => {
    const theme = useAppTheme();
    const { params } = useRoute<PoolRouteProp>();
    const poolId = params.poolId;

    const { data: enrichedPool, isLoading, error, refetch } = useEnrichedPoolById(poolId);

    const reportSheetRef = useRef<BottomSheetModal>(null);

    let body: React.ReactNode;
    if (isLoading) {
        body = <PoolSkeleton />;
    } else if (error) {
        body = <ErrorState message="Impossible de charger la poule." onRetry={refetch} />;
    } else if (!enrichedPool) {
        body = <ErrorState message="Cette poule est introuvable." onRetry={refetch} />;
    } else {
        body = (
            <>
                <PoolProfile enrichedPool={enrichedPool} />
                <PoolTabs enrichedPool={enrichedPool} />
            </>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <PoolHeader
                title={enrichedPool?.name}
                onCloseSheet={onCloseSheet}
                onOpenReport={() => reportSheetRef.current?.present()}
            />
            {body}

            <BottomSheetCustomModal
                ref={reportSheetRef}
                snapPoint={"90%"}
                onDismiss={() => reportSheetRef.current?.dismiss()}
            >
                <ReportForm
                    context={{
                        screen: "Pool",
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

export default PoolScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});
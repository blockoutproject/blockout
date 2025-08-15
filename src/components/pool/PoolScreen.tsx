import React from "react";
import { StyleSheet, View } from "react-native";
import { useEnrichedPoolById } from "@/src/hooks/pool/useEnrichedPoolById";
import PoolSkeleton from "@/src/components/pool/components/PoolSkeleton";
import PoolProfile from "@/src/components/pool/components/PoolProfile";
import PoolTabs from "@/src/components/pool/components/PoolTabs";
import { RouteProp, useRoute } from "@react-navigation/native";
import { SheetStackParamList } from "@/src/components/common/BottomSheetNavigator";
import ErrorState from "@/src/components/common/ErrorState";
import { useAppTheme } from "@/src/context/ThemeProvider";
import PoolHeader from "@/src/components/pool/components/PoolHeader";

type PoolRouteProp = RouteProp<SheetStackParamList, "Pool">;

type Props = {
    onCloseSheet: () => void;
};

const PoolScreen: React.FC<Props> = ({ onCloseSheet }) => {
    const theme = useAppTheme();
    const { params } = useRoute<PoolRouteProp>();
    const poolId = params.poolId;
    const { data: enrichedPool, isLoading, error, refetch } = useEnrichedPoolById(poolId);

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
            <PoolHeader title={enrichedPool?.name} onCloseSheet={onCloseSheet} />
            {body}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
});

export default PoolScreen;
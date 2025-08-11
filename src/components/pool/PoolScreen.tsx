import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { useEnrichedPoolById } from '@/src/hooks/pool/useEnrichedPoolById';
import PoolSkeleton from '@/src/components/pool/components/PoolSkeleton';
import PoolProfile from '@/src/components/pool/components/PoolProfile';
import PoolTabs from '@/src/components/pool/components/PoolTabs';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SheetStackParamList } from '@/src/components/common/BottomSheetNavigator';

type PoolRouteProp = RouteProp<SheetStackParamList, 'Pool'>;

const PoolScreen: React.FC = () => {
    const { params } = useRoute<PoolRouteProp>();
    const poolId = params.poolId;
    const { data: enrichedPool, isLoading, isError } = useEnrichedPoolById(poolId);
    const theme = useAppTheme();

    if (isError) {
        return <Text style={{ color: theme.error, padding: 16 }}>Erreur de chargement</Text>;
    }

    return (
        <View style={[styles.container]}>
            {isLoading || !enrichedPool ? (
                <PoolSkeleton />
            ) : (
                <>
                    <PoolProfile enrichedPool={enrichedPool} />
                    <PoolTabs enrichedPool={enrichedPool} />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default PoolScreen;
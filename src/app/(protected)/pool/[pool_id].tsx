import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { useEnrichedPoolById } from '@/src/hooks/pool/useEnrichedPoolById';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import PoolSkeleton from '@/src/components/pool/components/PoolSkeleton';
import PoolProfile from '@/src/components/pool/components/PoolProfile';
import PoolTabs from '@/src/components/pool/components/PoolTabs';
import { useLocalSearchParams } from 'expo-router';


const PoolScreen: React.FC = () => {
    const { pool_id } = useLocalSearchParams();
    const poolId = Number(pool_id);
    const { data: enrichedPool, isLoading, isError } = useEnrichedPoolById(poolId);
    const theme = useAppTheme();

    if (isError) {
        return <Text style={{ color: theme.error, padding: 16 }}>Erreur de chargement</Text>;
    }

    return (
        <View style={[ styles.container ]}>
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
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MatchSkeleton from '@/src/components/match/components/MatchSkeleton';
import { useAppTheme } from '@/src/context/ThemeProvider';
import PoolProfile from './components/PoolProfile';
import PoolTabs from './components/PoolTabs';
import { useEnrichedPoolById } from '@/src/hooks/pool/useEnrichedPoolById';
import PoolSkeleton from './components/PoolSkeleton';
import { BottomSheetView } from '@gorhom/bottom-sheet';

type Props = {
    poolId: number;
};

const PoolScreen: React.FC<Props> = ({ poolId }) => {
    const { data: enrichedPool, isLoading, isError } = useEnrichedPoolById(poolId);
    const theme = useAppTheme();

    if (isError) {
        return <Text style={{ color: theme.error, padding: 16 }}>Erreur de chargement</Text>;
    }

    return (
        <BottomSheetView style={[styles.container, { backgroundColor: theme.background }]}>
            {isLoading || !enrichedPool ? (
                <PoolSkeleton />
            ) : (
                <>
                    <PoolProfile enrichedPool={enrichedPool} />
                    <PoolTabs enrichedPool={enrichedPool} />
                </>
            )}
        </BottomSheetView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default PoolScreen;
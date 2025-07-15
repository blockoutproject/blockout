import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MatchSkeleton from '@/src/components/match/components/MatchSkeleton';
import { useAppTheme } from '@/src/context/ThemeProvider';
import PoolProfile from './components/PoolProfile';
import PoolTabs from './components/PoolTabs';
import { useEnrichedPoolById } from '@/src/hooks/pool/useEnrichedPoolById';

type Props = {
    poolId: number;
};

const PoolScreen: React.FC<Props> = ({ poolId }) => {
    const { data: enrichedPool, isLoading, isError } = useEnrichedPoolById(poolId);
    const theme = useAppTheme();

    if (isLoading) {
        return <MatchSkeleton />;
    }

    if (isError || !enrichedPool) {
        return <Text style={{ color: theme.error, padding: 16 }}>Erreur de chargement</Text>;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <PoolProfile enrichedPool={enrichedPool} />
            <PoolTabs enrichedPool={enrichedPool} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default PoolScreen;
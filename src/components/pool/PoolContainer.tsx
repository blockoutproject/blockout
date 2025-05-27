import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePoolById } from '@/src/hooks/pool/usePoolById';
import PoolProfile from '@/src/components/pool/PoolProfile';
import PoolTabs from '@/src/components/pool/PoolTabs';
import MatchSkeleton from '@/src/components/match/MatchSkeleton';
import { useAppTheme } from '@/src/context/ThemeProvider';

type Props = {
    poolId: number;
};

const PoolContainer: React.FC<Props> = ({ poolId }) => {
    const { data: pool, isLoading } = usePoolById(poolId);
    const theme = useAppTheme();

    if (isLoading) {
        return <MatchSkeleton />;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <PoolProfile pool={pool!} />
            <View style={styles.tabsContainer}>
                <PoolTabs pool={pool!} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabsContainer: {
        flex: 1,
    },
});

export default PoolContainer;
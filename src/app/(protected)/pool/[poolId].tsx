import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePoolById } from '@/src/hooks/pool/usePoolById';
import PoolProfile from '@/src/components/pool/PoolProfile';
import PoolTabs from '@/src/components/pool/PoolTabs';
import { colors } from '@/src/constants/Colors';
import MatchSkeleton from '@/src/components/match/MatchSkeleton';

const PoolModalScreen: React.FC = () => {
    const { poolId } = useLocalSearchParams();
    const { data: pool, isLoading } = usePoolById(Number(poolId));

    if (isLoading) {
        return <MatchSkeleton />;
    }

    return (
        <View style={styles.container}>
            <PoolProfile pool={pool!} />
            <View style={styles.tabsContainer}>
                <PoolTabs pool={pool!} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    tabsContainer: {
        flex: 1,
    },
});

export default PoolModalScreen;
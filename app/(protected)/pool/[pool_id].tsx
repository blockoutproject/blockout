import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePoolById } from '@/hooks/pool/usePoolById';
import PoolProfile from '@/components/pool/PoolProfile';
import PoolTabs from '@/components/pool/PoolTabs';

const PoolModalScreen: React.FC = () => {
    const { pool_id } = useLocalSearchParams();
    const poolId = Number(pool_id);
    const { data: pool } = usePoolById(poolId);

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
        backgroundColor: '#111',
    },
    tabsContainer: {
        flex: 1,
    },
});

export default PoolModalScreen;
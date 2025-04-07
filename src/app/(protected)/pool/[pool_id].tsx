import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { usePoolById } from '@/src/hooks/pool/usePoolById';
import PoolProfile from '@/src/components/pool/PoolProfile';
import PoolTabs from '@/src/components/pool/PoolTabs';
import { colors } from '@/src/constants/Colors';

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
        backgroundColor: colors.dark,
    },
    tabsContainer: {
        flex: 1,
    },
});

export default PoolModalScreen;
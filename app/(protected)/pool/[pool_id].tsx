import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PoolProfile } from '@/components/pool/PoolProfile';
import { PoolTabs } from '@/components/pool/PoolTabs';
import { useLocalSearchParams } from 'expo-router';
import { usePoolById } from '@/hooks/pool/usePoolById';

export default function PoolModalScreen() {
    const { pool_id } = useLocalSearchParams();
    const poolId = Number(pool_id);
    const { data: pool } = usePoolById(poolId);

    return (
        <View style={styles.container}>
            {/* Partie "profil" (logo, titre, lien, follow, etc.) */}
            <PoolProfile pool={pool!} />

            {/* TabView à 4 onglets */}
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
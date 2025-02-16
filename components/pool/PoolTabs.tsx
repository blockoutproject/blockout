// /components/pool/PoolTabs.tsx

import { Pool } from '@/types/Pool';
import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { RankingTab } from './RankingTab';
import FinishedMatchesTab from '../match/MatchListTab';
import MatchListTab from '../match/MatchListTab';
import { MatchStatus } from '@/types/Match';

type PoolTabsProps = {
    pool: Pool;
};

export function PoolTabs({ pool }: PoolTabsProps) {
    const layout = useWindowDimensions();

    // On ouvre éventuellement sur l'onglet "Classement" (index=2) :
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'results', title: 'Résultats' },
        { key: 'coming', title: 'À Venir' },
        { key: 'ranking', title: 'Classement' },
    ]);

    const renderScene = SceneMap({
        results: () => <MatchListTab pool={pool} status={MatchStatus.FINISHED} />,
        coming: () => <MatchListTab pool={pool} status={MatchStatus.UPCOMING} />,
        ranking: () => <RankingTab pool={pool} />,
    });

    return (
        <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={(props) => (
                <TabBar
                    {...props}
                    style={styles.tabBar}
                    indicatorStyle={styles.tabIndicator}
                />
            )}
            
        />
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#111',
    },
    tabIndicator: {
        backgroundColor: '#fff',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'none',
    },
    tabContent: {
        flex: 1,
        backgroundColor: '#111',
    },
});
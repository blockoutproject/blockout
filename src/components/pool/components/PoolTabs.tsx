import React, { useMemo } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GenericTabView from '@/src/components/common/GenericTabView';
import MatchList from '@/src/components/matchList/MatchListContainer';

import { MatchStatus } from '@/src/types/Match';
import { EnrichedPoolDTO } from '@/src/types/Pool';
import { BOTTOM_TABBAR_HEIGHT, TABBAR_HEIGHT } from '@/src/theme/globals';
import RankingTab from '../../ranking/RankingTab';

type PoolTabsProps = {
    enrichedPool: EnrichedPoolDTO;
};

const PoolTabs: React.FC<PoolTabsProps> = ({ enrichedPool }) => {
    const insets = useSafeAreaInsets();

    const tabs = [
        { key: 'ranking', title: 'Classement' },
        { key: 'finished', title: 'Terminés' },
        { key: 'upcoming', title: 'À Venir' },
    ];

    const scrollYs = useMemo(() => {
        return Object.fromEntries(
            tabs.map(tab => [tab.key, new Animated.Value(0)])
        );
    }, []);

    const renderTabs = tabs.map((tab) => {
        if (tab.key === 'ranking') {
            return {
                ...tab,
                render: () => <RankingTab enrichedPool={enrichedPool} />,
            };
        }

        if (tab.key === 'finished') {
            return {
                ...tab,
                render: () => (
                    <MatchList
                        poolIds={[enrichedPool.id]}
                        status={MatchStatus.FINISHED}
                        scrollY={scrollYs[tab.key]}
                        headerOffset={TABBAR_HEIGHT}
                        contentContainerStyle={{
                            paddingHorizontal: 4,
                            marginTop: TABBAR_HEIGHT + 4,
                            paddingBottom: insets.bottom + TABBAR_HEIGHT + BOTTOM_TABBAR_HEIGHT + 4,
                        }}
                        showPoolHeader={false}
                    />
                ),
            };
        }

        if (tab.key === 'upcoming') {
            return {
                ...tab,
                render: () => (
                    <MatchList
                        poolIds={[enrichedPool.id]}
                        status={MatchStatus.UPCOMING}
                        scrollY={scrollYs[tab.key]}
                        headerOffset={TABBAR_HEIGHT}
                        contentContainerStyle={{
                            paddingHorizontal: 4,
                            marginTop: TABBAR_HEIGHT + 4,
                            paddingBottom: insets.bottom + TABBAR_HEIGHT + BOTTOM_TABBAR_HEIGHT + 4,
                        }}
                        showPoolHeader={false}
                    />
                ),
            };
        }

        return {
            ...tab,
            render: () => null,
        };
    });

    return (
        <GenericTabView
            tabs={renderTabs}
            scrollYs={scrollYs}
        />
    );
};

export default PoolTabs;
import React, { useMemo, useState } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GenericTabView from '@/src/components/common/GenericTabView';
import MatchList from '@/src/components/matchList/MatchListContainer';

import { MatchStatus } from '@/src/types/Match';
import { EnrichedTeamDTO } from '@/src/types/Team';
import { BOTTOM_TABBAR_HEIGHT, TABBAR_HEIGHT } from '@/src/theme/globals';
import { useAppTheme } from '@/src/context/ThemeProvider';
import RankingTab from '../../ranking/RankingTab';

type Props = { enrichedTeam: EnrichedTeamDTO };

const TeamTabs: React.FC<Props> = ({ enrichedTeam }) => {
    const insets = useSafeAreaInsets();

    const staticTabs = [
        {
            key: 'finished',
            title: 'Terminés',
        },
        {
            key: 'upcoming',
            title: 'À Venir',
        },
    ];

    const dynamicTabs = enrichedTeam.pools.map((p) => ({
        key: `pool-${p.id}`,
        title: p.name,
    }));

    const allTabs = [...staticTabs, ...dynamicTabs];

    const scrollYs = useMemo(() => {
        return Object.fromEntries(
            allTabs.map(tab => [tab.key, new Animated.Value(0)])
        );
    }, [enrichedTeam]);

    const tabs = allTabs.map((tab) => {
        if (tab.key === 'finished') {
            return {
                ...tab,
                render: () => (
                    <MatchList
                        teamIds={[enrichedTeam.id]}
                        status={MatchStatus.FINISHED}
                        scrollY={scrollYs[tab.key]}
                        headerOffset={TABBAR_HEIGHT}
                        contentContainerStyle={{
                            paddingHorizontal: 4,
                            marginTop: TABBAR_HEIGHT + 4,
                            paddingBottom: insets.bottom + TABBAR_HEIGHT + BOTTOM_TABBAR_HEIGHT + 4,
                        }}
                        home={false}
                    />
                ),
            };
        }

        if (tab.key === 'upcoming') {
            return {
                ...tab,
                render: () => (
                    <MatchList
                        teamIds={[enrichedTeam.id]}
                        status={MatchStatus.UPCOMING}
                        scrollY={scrollYs[tab.key]}
                        headerOffset={TABBAR_HEIGHT}
                        contentContainerStyle={{
                            paddingHorizontal: 4,
                            marginTop: TABBAR_HEIGHT + 4,
                            paddingBottom: insets.bottom + TABBAR_HEIGHT + BOTTOM_TABBAR_HEIGHT + 4,
                        }}
                        home={false}
                    />
                ),
            };
        }

        const poolId = Number(tab.key.replace('pool-', ''));
        const pool = enrichedTeam.pools.find(p => p.id === poolId);

        return {
            ...tab,
            render: () => pool
                ? <RankingTab
                    enrichedPool={pool}
                    highlightTeams={[
                        {
                            teamId: pool.ranking.find(t => t.id === enrichedTeam.id)?.id,
                            color: `${pool.division.mainColor}`,
                        },
                    ]} />
                : null,
        };
    })

    return (
        <GenericTabView
            tabs={tabs}
            scrollYs={scrollYs}
        />
    );
};

export default TeamTabs;
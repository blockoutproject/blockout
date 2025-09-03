// src/screens/team/tabs/TeamTabs.tsx
import React, { useMemo } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GenericTabView from '@/src/components/common/GenericTabView';
import MatchList from '@/src/components/matchList/MatchListContainer';

import { MatchStatus } from '@/src/types/Match';
import { EnrichedTeamDTO } from '@/src/types/Team';
import { BOTTOM_TABBAR_HEIGHT, TABBAR_HEIGHT } from '@/src/theme/globals';
import RankingTab from '../../ranking/RankingTab';

type Props = { enrichedTeam: EnrichedTeamDTO };

const TeamTabs: React.FC<Props> = ({ enrichedTeam }) => {
    const insets = useSafeAreaInsets();

    const tabs = useMemo(
        () => [
            { key: 'finished', title: 'Terminés' },
            { key: 'upcoming', title: 'À Venir' },
            ...enrichedTeam.pools.map((p) => ({ key: `pool-${p.id}`, title: p.name })),
        ],
        [enrichedTeam.pools]
    );

    const scrollYs = useMemo(() => {
        return Object.fromEntries(tabs.map(tab => [tab.key, new Animated.Value(0)]));
    }, [tabs]);

    const finished = useMemo(
        () => (
            <MatchList
                teamIds={[enrichedTeam.id]}
                status={MatchStatus.FINISHED}
                scrollY={scrollYs['finished']}
                headerOffset={TABBAR_HEIGHT}
                contentContainerStyle={{
                    paddingHorizontal: 4,
                    marginTop: TABBAR_HEIGHT + 4,
                    paddingBottom: insets.bottom + TABBAR_HEIGHT + BOTTOM_TABBAR_HEIGHT + 4,
                }}
                home={false}
            />
        ),
        [enrichedTeam.id, insets.bottom, scrollYs]
    );

    const upcoming = useMemo(
        () => (
            <MatchList
                teamIds={[enrichedTeam.id]}
                status={MatchStatus.UPCOMING}
                scrollY={scrollYs['upcoming']}
                headerOffset={TABBAR_HEIGHT}
                contentContainerStyle={{
                    paddingHorizontal: 4,
                    marginTop: TABBAR_HEIGHT + 4,
                    paddingBottom: insets.bottom + TABBAR_HEIGHT + BOTTOM_TABBAR_HEIGHT + 4,
                }}
                home={false}
            />
        ),
        [enrichedTeam.id, insets.bottom, scrollYs]
    );

    const renderTabs = useMemo(
        () =>
            tabs.map(tab => {
                if (tab.key === 'finished') return { ...tab, render: () => finished };
                if (tab.key === 'upcoming') return { ...tab, render: () => upcoming };

                const poolId = Number(tab.key.replace('pool-', ''));
                const pool = enrichedTeam.pools.find(p => p.id === poolId);

                return {
                    ...tab,
                    render: () =>
                        pool ? (
                            <RankingTab
                                enrichedPool={pool}
                                highlightTeams={[
                                    {
                                        teamId: pool.ranking.find(t => t.id === enrichedTeam.id)?.id,
                                        color: `${pool.division.mainColor}`,
                                    },
                                ]}
                            />
                        ) : null,
                };
            }),
        [tabs, finished, upcoming, enrichedTeam.pools, enrichedTeam.id]
    );

    return <GenericTabView tabs={renderTabs} scrollYs={scrollYs} />;
};

export default TeamTabs;
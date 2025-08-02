import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GenericTabView from '@/src/components/common/GenericTabView';
import MatchList from '@/src/components/matchList/MatchListContainer';
import RankingTab from '@/src/components/common/RankingTab';

import { MatchStatus } from '@/src/types/Match';
import { EnrichedTeamDTO } from '@/src/types/Team';

type Props = { enrichedTeam: EnrichedTeamDTO };

const TeamTabs: React.FC<Props> = ({ enrichedTeam }) => {
    const insets = useSafeAreaInsets();

    const staticTabs = [
        {
            key: 'finished',
            title: 'Terminés',
            render: () => (
                <MatchList
                    teamIds={[enrichedTeam.id]}
                    status={MatchStatus.FINISHED}
                    contentContainerStyle={{
                        paddingHorizontal: 4,
                        marginTop: 8,
                        paddingBottom: insets.bottom + 8,
                    }}
                />
            ),
        },
        {
            key: 'upcoming',
            title: 'À Venir',
            render: () => (
                <MatchList
                    teamIds={[enrichedTeam.id]}
                    status={MatchStatus.UPCOMING}
                    contentContainerStyle={{
                        paddingHorizontal: 4,
                        marginTop: 8,
                        paddingBottom: insets.bottom + 8,
                    }}
                />
            ),
        },
    ];

    const dynamicTabs = enrichedTeam.pools.map((p) => ({
        key: `pool-${p.id}`,
        title: p.name,
        render: () => <RankingTab enrichedPool={p} />,
    }));

    return <GenericTabView tabs={[...staticTabs, ...dynamicTabs]} />;
};

export default TeamTabs;
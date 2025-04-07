import GenericTabView from '@/src/components/common/GenericTabView';
import React from 'react';
import MatchListTab from '../match/matchList/MatchListTab';
import { MatchStatus } from '@/src/types/Match';
import RankingTab from '../common/RankingTab';
import { Pool } from '@/src/types/Pool';
import { colors } from '@/src/constants/Colors';

type PoolTabsProps = {
    pool: Pool;
};

const PoolTabs: React.FC<PoolTabsProps> = ({ pool }) => {
    const tabs = [
        {
            key: 'ranking',
            title: 'Classement',
            render: () => <RankingTab poolId={pool.id} />,
        },
        {
            key: 'finished',
            title: 'Terminés',
            render: () => <MatchListTab poolIds={[pool.id]} status={MatchStatus.FINISHED} />,
        },
        {
            key: 'upcoming',
            title: 'À Venir',
            render: () => <MatchListTab poolIds={[pool.id]} status={MatchStatus.UPCOMING} />,
        },
    ];

    return <GenericTabView tabs={tabs} indicatorColor={colors.active} />;
};

export default PoolTabs;
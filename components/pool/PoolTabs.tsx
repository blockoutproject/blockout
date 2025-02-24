import GenericTabView from '@/components/common/GenericTabView';
import React from 'react';
import MatchListTab from '../match/MatchListTab';
import { MatchStatus } from '@/types/Match';
import RankingTab from '../common/RankingTab';
import { Pool } from '@/types/Pool';

type PoolTabsProps = {
    pool: Pool;
};

const PoolTabs: React.FC<PoolTabsProps> = ({ pool }) => {
    const tabs = [
        {
            key: 'results',
            title: 'Résultats',
            render: () => <MatchListTab pool={pool} status={MatchStatus.FINISHED} />,
        },
        {
            key: 'coming',
            title: 'À Venir',
            render: () => <MatchListTab pool={pool} status={MatchStatus.UPCOMING} />,
        },
        {
            key: 'ranking',
            title: 'Classement',
            render: () => <RankingTab poolId={pool.id} />,
        },
    ];

    return <GenericTabView tabs={tabs} indicatorColor="white" />;
};

export default PoolTabs;
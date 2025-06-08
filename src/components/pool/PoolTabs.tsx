import React from 'react';
import GenericTabView from '@/src/components/common/GenericTabView';
import MatchListTab from '../matchList/MatchList';
import RankingTab from '../common/RankingTab';
import { MatchStatus } from '@/src/types/Match';
import { Pool } from '@/src/types/Pool';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PoolTabsProps = {
    pool: Pool;
};

const PoolTabs: React.FC<PoolTabsProps> = ({ pool }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const tabs = [
        {
            key: 'ranking',
            title: 'Classement',
            render: () => <RankingTab poolId={pool.id} />,
        },
        {
            key: 'finished',
            title: 'Terminés',
            render: () => (
                <MatchListTab
                    poolIds={[pool.id]}
                    status={MatchStatus.FINISHED}
                    contentContainerStyle={{
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
                <MatchListTab
                    poolIds={[pool.id]}
                    status={MatchStatus.UPCOMING}
                    contentContainerStyle={{
                        marginTop: 8,
                        paddingBottom: insets.bottom + 8,
                    }}
                />
            ),
        },
    ];

    return (
        <GenericTabView
            tabs={tabs}
            indicatorColor={theme.text}
        />
    );
};

export default PoolTabs;
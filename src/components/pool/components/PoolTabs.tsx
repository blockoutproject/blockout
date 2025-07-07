import React from 'react';
import GenericTabView from '@/src/components/common/GenericTabView';
import MatchList from '../../matchList/MatchListContainer';
import RankingTab from '../../common/RankingTab';
import { MatchStatus } from '@/src/types/Match';
import { EnrichedPoolDTO, Pool } from '@/src/types/Pool';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Division } from '@/src/types/Division';

type PoolTabsProps = {
    enrichedPool: EnrichedPoolDTO;
};

const PoolTabs: React.FC<PoolTabsProps> = ({ enrichedPool }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const tabs = [
        {
            key: 'ranking',
            title: 'Classement',
            render: () => <RankingTab enrichedPool={enrichedPool} />,
        },
        {
            key: 'finished',
            title: 'Terminés',
            render: () => (
                <MatchList
                    poolIds={[enrichedPool.id]}
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
                    poolIds={[enrichedPool.id]}
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

    return (
        <GenericTabView
            tabs={tabs}
            indicatorColor={theme.text}
        />
    );
};

export default PoolTabs;
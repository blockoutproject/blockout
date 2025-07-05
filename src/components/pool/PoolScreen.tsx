import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePoolById } from '@/src/hooks/pool/usePoolById';
import MatchSkeleton from '@/src/components/match/components/MatchSkeleton';
import { useAppTheme } from '@/src/context/ThemeProvider';
import PoolProfile from './components/PoolProfile';
import PoolTabs from './components/PoolTabs';
import { useDivisionById } from '@/src/hooks/config/division/useDivisionById';

type Props = {
    poolId: number;
};

const PoolScreen: React.FC<Props> = ({ poolId }) => {
    const { data: pool, isLoading: isPoolLoading } = usePoolById(poolId);
    const { data: division, isLoading: isDivisionLoading } = useDivisionById(pool?.divisionId);
    const theme = useAppTheme();

    if (isPoolLoading || isDivisionLoading) {
        return <MatchSkeleton />;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <PoolProfile pool={pool!} division={division!}/>
            <View style={styles.tabsContainer}>
                <PoolTabs pool={pool!} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabsContainer: {
        flex: 1,
    },
});

export default PoolScreen;
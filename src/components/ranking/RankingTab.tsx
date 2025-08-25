import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RankingCard from './RankingCard';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { EnrichedPoolDTO } from '@/src/types/Pool';
import { BOTTOM_TABBAR_HEIGHT, TABBAR_HEIGHT } from '@/src/theme/globals';
import { TeamHighlight } from '@/src/types/Team';

type Props = {
    enrichedPool: EnrichedPoolDTO
    highlightTeams?: TeamHighlight[];
};

const RankingTab: React.FC<Props> = ({ enrichedPool, highlightTeams }) => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    marginTop: TABBAR_HEIGHT + 8,
                    paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + 12,
                    backgroundColor: theme.background
                },
            ]}
        >
            <RankingCard enrichedPool={enrichedPool} highlightTeams={highlightTeams} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 4,
    },
});

export default RankingTab;
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RankingCard from './RankingCard';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { EnrichedPoolDTO } from '@/src/types/Pool';

type Props = { enrichedPool: EnrichedPoolDTO };

const RankingTab: React.FC<Props> = ({ enrichedPool }) => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    return (
        <View
            style={[
                styles.container,
                { paddingBottom: insets.bottom + 8, backgroundColor: theme.background },
            ]}
        >
            <RankingCard enrichedPool={enrichedPool} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 4,
        paddingTop: 16,
    },
});

export default RankingTab;
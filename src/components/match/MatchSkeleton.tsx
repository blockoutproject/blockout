import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useAppTheme } from '@/src/context/ThemeProvider';

const MatchSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <View style={[styles.screen, { backgroundColor: theme.background }]}>
            <Skeleton
                colors={[theme.backgroundSecondary, theme.surfaceSecondary, theme.backgroundSecondary]}
                width="100%"
                height={200}
            />
            <Skeleton
                colors={[theme.backgroundSecondary, theme.surfaceSecondary, theme.backgroundSecondary]}
                width="100%"
                height={150}
            />
            <Skeleton
                colors={[theme.background, theme.surfaceSecondary, theme.backgroundSecondary]}
                width="100%"
                height={200}
            />
            <Skeleton
                colors={[theme.backgroundSecondary, theme.surfaceSecondary, theme.backgroundSecondary]}
                width="100%"
                height={250}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        paddingHorizontal: 8,
        gap: 16,
    },
});

export default MatchSkeleton;
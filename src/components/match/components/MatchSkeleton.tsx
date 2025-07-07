import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useAppTheme } from '@/src/context/ThemeProvider';

const MatchSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <View style={[styles.skeletonContainer, { backgroundColor: theme.background }]}>
            <Skeleton colors={[theme.surface, theme.backgroundSecondary, theme.surface]} width="100%" height={200} />
            <Skeleton colors={[theme.surface, theme.backgroundSecondary, theme.surface]} width="100%" height={150} />
            <Skeleton colors={[theme.surface, theme.backgroundSecondary, theme.surface]} width="100%" height={200} />
            <Skeleton colors={[theme.surface, theme.backgroundSecondary, theme.surface]} width="100%" height={250} />
        </View>
    );
};

const styles = StyleSheet.create({
    skeletonContainer: {
        flex: 1,
        gap: 20,
        paddingHorizontal: 4,
    },
});

export default MatchSkeleton;

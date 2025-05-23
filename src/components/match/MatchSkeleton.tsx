import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useAppTheme } from '@/src/context/ThemeProvider';

type SkeletonCardProps = {
    flexValue: number;
};

const SkeletonCard: React.FC<SkeletonCardProps> = ({ flexValue }) => {
    const theme = useAppTheme();

    return (
        <MotiView
            style={[styles.card, { flex: flexValue, backgroundColor: theme.background }]}
            transition={{
                type: 'timing',
            }}
        >
            <Skeleton
                colorMode="dark"
                width="100%"
                height="100%"
            />
        </MotiView>
    );
};

const MatchSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <View style={[styles.screen, { backgroundColor: theme.background }]}>
            <SkeletonCard flexValue={0.7} />
            <SkeletonCard flexValue={1} />
            <SkeletonCard flexValue={1.4} />
            <SkeletonCard flexValue={1} />
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        padding: 16,
        gap: 24,
    },
    card: {
        borderRadius: 12,
        overflow: 'hidden',
    },
});

export default MatchSkeleton;
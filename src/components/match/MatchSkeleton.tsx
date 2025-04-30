import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/src/constants/Colors';
import { Skeleton } from 'moti/skeleton';

type SkeletonCardProps = {
    flexValue: number;
};

const SkeletonCard: React.FC<SkeletonCardProps> = ({ flexValue }) => (
    <MotiView
        style={[styles.card, { flex: flexValue }]}
        transition={{
            type: 'timing',
        }}
        animate={{ backgroundColor: colors.dark }}
    >
        <Skeleton
            colorMode="dark"
            width="100%"
            height="100%"
        />
    </MotiView>
);

const MatchSkeleton: React.FC = () => {
    return (
        <View style={styles.screen}>
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
        backgroundColor: colors.dark,
    },
    card: {
        borderRadius: 12,
        overflow: 'hidden',
    },
});

export default MatchSkeleton;
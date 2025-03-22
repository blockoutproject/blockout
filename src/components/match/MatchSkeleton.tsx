import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/src/constants/Colors';
import { Skeleton } from 'moti/skeleton';

const SkeletonCard = ({ style }: { style: any }) => (
    <MotiView
        style={[styles.card, style]}
        transition={{
            type: 'timing',
        }}
        animate={{ backgroundColor: colors.dark }}
    >
        <Skeleton
            colorMode={'dark'} 
            width="100%"
            height="100%"
        />
    </MotiView>
);

const MatchSkeleton: React.FC = () => {
    return (
        <View style={styles.screen}>
            <SkeletonCard style={{ flex: 0.7 }} />
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1.4 }} />
            <SkeletonCard style={{ flex: 1 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        padding: 16,
        gap: 16,
        backgroundColor: colors.dark,
    },
    card: {
        borderRadius: 12,
        overflow: 'hidden',
    },
});

export default MatchSkeleton;
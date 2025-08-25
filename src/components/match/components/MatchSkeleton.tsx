import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../../common/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_HEIGHT } from '@/src/theme/globals';

const MatchSkeleton: React.FC = () => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.skeletonContainer, { paddingTop: insets.top + HEADER_HEIGHT }]}>
            <Skeleton width="100%" height={200} style={{ borderRadius: 18 }} />
            <Skeleton width="100%" height={150} style={{ borderRadius: 18 }} />
            <Skeleton width="100%" height={200} style={{ borderRadius: 18 }} />
            <Skeleton width="100%" height={250} style={{ borderRadius: 18 }} />
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

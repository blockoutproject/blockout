import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { Skeleton } from '../../common/Skeleton';

const MatchSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <View style={[styles.skeletonContainer, { backgroundColor: theme.background }]}>
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

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../../common/Skeleton';

const ClubSkeleton: React.FC = () => {
    return (
        <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={230} style={{ borderRadius: 18 }} />
            <Skeleton width="100%" height={230} style={{ borderRadius: 18 }} />
            <Skeleton width="100%" height={180} style={{ borderRadius: 18 }} />
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

export default ClubSkeleton;

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "@/src/components/common/Skeleton";

/** Skeleton for club screen while loading. */
const ClubSkeleton: React.FC = () => {
    return (
        <View
            style={styles.skeletonContainer}
            testID="club-skeleton"
        >
            <Skeleton
                width="100%"
                height={230}                
                style={{ borderRadius: 18 }}
            />
            <Skeleton
                width="100%"
                height={230}
                style={{ borderRadius: 18 }}
            />
            <Skeleton
                width="100%"
                height={180}
                style={{ borderRadius: 18 }}
            />
        </View>
    );
};

export default ClubSkeleton;

const styles = StyleSheet.create({
    skeletonContainer: {
        flex: 1,
        gap: 20,
        paddingHorizontal: 4,
    },
});
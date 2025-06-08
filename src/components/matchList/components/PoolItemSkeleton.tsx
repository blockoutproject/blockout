import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "moti/skeleton";
import GradientView from "@/src/components/common/GradientView";
import { useAppTheme } from "@/src/context/ThemeProvider";

const PoolItemSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <GradientView style={styles.skeletonContainer}>
            <View style={styles.skeletonHeader}>
                <Skeleton width="70%" height={20} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>
            <View style={styles.skeletonMatch}>
                <Skeleton width="100%" height={120} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>
        </GradientView>
    );
};

const styles = StyleSheet.create({
    skeletonContainer: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
    },
    skeletonHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 8,
    },
    skeletonMatch: {
        flexDirection: "column",
        gap: 12,
    },
});

export default PoolItemSkeleton;
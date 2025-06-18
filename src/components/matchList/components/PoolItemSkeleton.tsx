import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "moti/skeleton";
import GradientView from "@/src/components/common/GradientView";
import { useAppTheme } from "@/src/context/ThemeProvider";

const PoolItemSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <View style={[styles.skeletonContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <View style={styles.skeletonHeader}>
                <Skeleton radius={12} width="50%" height={25} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>
            <View>
                <Skeleton radius={12} width="100%" height={120} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    skeletonContainer: {
        borderRadius: 18,
        padding: 8,
        marginBottom: 16,
    },
    skeletonHeader: {
        marginBottom: 8,
    },
});

export default PoolItemSkeleton;
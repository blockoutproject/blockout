import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "moti/skeleton";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/src/context/ThemeProvider";

const PoolItemSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <LinearGradient
            colors={[theme.background, theme.backgroundSecondary]}
            start={{ x: 0, y: 2 }}
            end={{ x: 0, y: 0 }}
            style={[styles.poolContainer, { backgroundColor: theme.backgroundSecondary }]}
        >
            <View style={styles.poolHeader}>
                <Skeleton width="70%" height={20} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>

            <View style={styles.matchesWrapper}>
                <Skeleton width="100%" height={120} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    poolContainer: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
    },
    poolHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 8,
    },
    matchesWrapper: {
        flexDirection: "column",
        gap: 12,
    },
});

export default PoolItemSkeleton;
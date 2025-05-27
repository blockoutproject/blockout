import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "moti/skeleton";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/src/context/ThemeProvider";
import GradientView from "@/src/components/common/GradientView";

const PoolItemSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <GradientView style={[styles.container]}>
            <View style={styles.poolHeader}>
                <Skeleton width="70%" height={20} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>

            <View style={styles.matchesWrapper}>
                <Skeleton width="100%" height={120} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>
        </GradientView>
    );
};

const styles = StyleSheet.create({
    container: {
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
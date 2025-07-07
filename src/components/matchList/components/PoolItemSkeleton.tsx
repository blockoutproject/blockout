import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "moti/skeleton";
import { useAppTheme } from "@/src/context/ThemeProvider";

type Props = {
    itemCount: number;
};

const PoolItemSkeleton: React.FC<Props> = ({ itemCount }) => {
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.surfaceSecondary }]}>
            <View style={styles.header}>
                <Skeleton
                    radius={12}
                    width="50%"
                    height={25}
                    colors={[theme.background, theme.backgroundSecondary, theme.background]}
                />
            </View>

            <View style={styles.itemList}>
                {Array.from({ length: itemCount }).map((_, i) => (
                    <Skeleton
                        key={i}
                        radius={12}
                        width="100%"
                        height={70}
                        colors={[theme.background, theme.backgroundSecondary, theme.background]}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        padding: 8,
    },
    header: {
        marginBottom: 8,
    },
    itemList: {
        flexDirection: "column",
        gap: 8,
    },
});

export default PoolItemSkeleton;
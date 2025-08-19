import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Skeleton } from "../../common/Skeleton";

const PoolSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.row}>
                <Skeleton width={100} height={100} style={{ borderRadius: 18 }} />
                <View style={styles.info}>
                    <View style={styles.title}>
                        <Skeleton width={220} height={20} />
                    </View>
                    <View style={styles.infoLine}>
                        <Skeleton width={170} height={13} style={{ borderRadius: 18 }} />
                    </View>
                    <View style={styles.infoLine}>
                        <Skeleton width={170} height={13} style={{ borderRadius: 18 }} />
                    </View>
                    <View style={styles.infoLine}>
                        <Skeleton width={170} height={13} style={{ borderRadius: 18 }} />
                    </View>
                </View>
            </View>

            <View style={styles.actionsRow}>
                <Skeleton width={85} height={34} style={{ borderRadius: 10 }} />
                <Skeleton width={25} height={25} style={{ borderRadius: 18, marginLeft: 12 }} />
                <Skeleton width={20} height={25} style={{ borderRadius: 18, marginLeft: 8 }} />
            </View>
        </View>
    );
};

export default PoolSkeleton;

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
        paddingHorizontal: 16,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    info: {
        flex: 1,
        justifyContent: "center",
    },
    title: {
        marginBottom: 10,
    },
    infoLine: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
    },
});
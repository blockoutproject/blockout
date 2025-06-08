import React from "react";
import { SectionList, Text, View, StyleSheet } from "react-native";
import PoolItemSkeleton from "./PoolItemSkeleton";
import { useAppTheme } from "@/src/context/ThemeProvider";

const MatchListSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <SectionList
            sections={[{ title: "Chargement...", data: new Array(2).fill(null) }]}
            keyExtractor={(_, i) => `skeleton-${i}`}
            renderSectionHeader={() => (
                <View style={styles.dateContainer}>
                    <Text style={[styles.dateHeader, { color: theme.text }]}>Chargement...</Text>
                </View>
            )}
            scrollEnabled={false}
            renderItem={() => <PoolItemSkeleton />}
            contentContainerStyle={styles.sectionListContent}
        />
    );
};

const styles = StyleSheet.create({
    sectionListContent: {
        paddingBottom: 8,
    },
    dateContainer: {
        backgroundColor: "transparent",
        alignItems: "center",
    },
    dateHeader: {
        fontSize: 14,
        fontWeight: "800",
    },
});

export default MatchListSkeleton;
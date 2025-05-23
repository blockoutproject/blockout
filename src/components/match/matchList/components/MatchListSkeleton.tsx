import React from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import PoolItemSkeleton from "./PoolItemSkeleton";
import { useAppTheme } from "@/src/context/ThemeProvider";

const MatchListTabSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <SectionList
            sections={[
                { title: "Chargement...", data: new Array(2).fill(null) },
            ]}
            keyExtractor={(_, index) => `skeleton-${index}`}
            renderSectionHeader={() => (
                <View style={styles.dateContainer}>
                    <Text style={[styles.dateHeader, { color: theme.text }]}>Chargement...</Text>
                </View>
            )}
            scrollEnabled={false}
            renderItem={() => <PoolItemSkeleton />}
            contentContainerStyle={styles.contentContainer}
        />
    );
};

const styles = StyleSheet.create({
    contentContainer: {
        paddingHorizontal: 8,
    },
    dateContainer: {
        backgroundColor: "transparent",
        alignItems: "center",
        marginVertical: 8,
    },
    dateHeader: {
        fontSize: 18,
        fontWeight: "700",
    },
});

export default MatchListTabSkeleton;
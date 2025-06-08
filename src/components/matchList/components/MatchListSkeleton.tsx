import React from "react";
import { SectionList, Text, View } from "react-native";
import PoolItemSkeleton from "./PoolItemSkeleton";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { matchListStyles } from "../matchListStyles";

const MatchListSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <SectionList
            sections={[{ title: "Chargement...", data: new Array(2).fill(null) }]}
            keyExtractor={(_, i) => `skeleton-${i}`}
            renderSectionHeader={() => (
                <View style={matchListStyles.dateContainer}>
                    <Text style={[matchListStyles.dateHeader, { color: theme.text }]}>Chargement...</Text>
                </View>
            )}
            scrollEnabled={false}
            renderItem={() => <PoolItemSkeleton />}
            contentContainerStyle={matchListStyles.sectionListContent}
        />
    );
};

export default MatchListSkeleton;
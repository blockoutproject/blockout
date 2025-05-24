import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import SearchResultItem from "./SearchResultItem";
import { useAppTheme } from "@/src/context/ThemeProvider";

type SearchResultsListProps = {
    results: Array<{ id: string; title: string; subtitle?: string; imageUrl?: string }>;
    onItemPress: (id: string) => void;
};

const SearchResultsList: React.FC<SearchResultsListProps> = ({ results, onItemPress }) => {
    const theme = useAppTheme();

    if (results.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.emptyText, { color: theme.textInactive }]}>Aucun résultat trouvé</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <SearchResultItem
                    title={item.title}
                    subtitle={item.subtitle}
                    imageUrl={item.imageUrl}
                    onPress={() => onItemPress(item.id)}
                />
            )}
            contentContainerStyle={[styles.listContainer, { backgroundColor: theme.background }]}
        />
    );
};

const styles = StyleSheet.create({
    listContainer: {
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "600",
    },
});

export default SearchResultsList;

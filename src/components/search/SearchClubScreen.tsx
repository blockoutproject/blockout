import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    Keyboard,
    FlatList,
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import SearchBar from "@/src/components/common/SearchBar";
import ClubCard from "@/src/components/search/ClubCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useSearchClubs } from "@/src/hooks/search/useSearchClubs";
import { useRouter } from "expo-router";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";

export type SearchClubScreenProps = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
};

const SearchClubScreen: React.FC<SearchClubScreenProps> = ({
    search,
    debouncedQuery,
    setSearch,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const triggerOnEmpty = search.length === 0;

    const { data: clubs, isLoading, isError, refetch } = useSearchClubs(
        debouncedQuery,
        triggerOnEmpty
    );

    const handleClubPress = (clubId: string) => {
        Haptics.selectionAsync();
        router.push(`/clubs/${clubId}`);
    };

    const renderEmpty = () => {
        if (debouncedQuery.length > 1 && !isLoading && !isError) {
            return (
                <View style={styles.emptyContainer}>
                    <Text
                        style={[
                            styles.emptyText,
                            { color: theme.textInactive },
                        ]}
                    >
                        Aucun club trouvé pour cette recherche.
                    </Text>
                </View>
            );
        }
        return null;
    };

    return (
        <KeyboardAvoidingView
            style={[
                styles.container,
                { backgroundColor: theme.background },
            ]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            testID="search-club-screen"
        >
            <View style={styles.searchRow}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Rechercher un club..."
                    inSheet={false}
                />
            </View>

            {isLoading && (
                <ActivityIndicator
                    size="small"
                    color={theme.text}
                    style={styles.loader}
                />
            )}

            {isError && (
                <ErrorState
                    subtitle="Impossible de charger la liste des clubs."
                    onRetry={refetch}
                />
            )}

            <FlatList
                data={clubs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <ClubCard
                        club={item}
                        onPress={() => {
                            Keyboard.dismiss();
                            handleClubPress(item.id);
                        }}
                    />
                )}
                ListEmptyComponent={renderEmpty}
                ListHeaderComponent={
                    search.length === 0 && clubs && clubs.length > 0 ? (
                        <Text
                            style={[
                                styles.exampleLabel,
                                { color: theme.textInactive },
                            ]}
                        >
                            Exemples de clubs
                        </Text>
                    ) : null
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={[
                    { paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT },
                ]}
                scrollEnabled={Boolean(clubs && clubs.length > 0)}
                testID="search-club-list"
            />
        </KeyboardAvoidingView>
    );
};

export default SearchClubScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 8,
    },
    searchRow: {
        marginTop: 8,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
    },
    loader: {
        marginTop: 8,
    },
    emptyContainer: {
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        textAlign: "center",
    },
    exampleLabel: {
        fontSize: 13,
        fontStyle: "italic",
        marginBottom: 8,
        textAlign: "center",
    },
});
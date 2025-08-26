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
import ClubCard from "@/src/components/search/components/ClubCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useSearchClubs } from "@/src/hooks/search/useSearchClubs";
import { useRouter } from "expo-router";
import ErrorState from "../../common/feedback/ErrorState";
import SearchState from "../../common/feedback/SearchState.tsx";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";

type Props = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
    isInputFocused: boolean;
    setIsInputFocused: (focused: boolean) => void;
};

const SearchClubScreen: React.FC<Props> = ({
    search,
    debouncedQuery,
    setSearch,
    isInputFocused,
    setIsInputFocused,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { data: clubs, isLoading, isError, refetch } = useSearchClubs(debouncedQuery);
    const router = useRouter();

    const handleClubPress = (clubId: string) => {
        Haptics.selectionAsync();
        router.push(`/clubs/${clubId}`);
    }

    const renderEmpty = () => {
        if (!search && !isInputFocused) return <SearchState />;
        if (debouncedQuery.length > 1 && !isLoading && !isError) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textInactive }]}>
                        Aucun club trouvé pour cette recherche.
                    </Text>
                </View>
            );
        }
        return null;
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.searchRow}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Rechercher un club..."
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    inSheet={false}
                />
            </View>

            {isLoading && (
                <ActivityIndicator size="small" color={theme.text} style={styles.loader} />
            )}

            {isError && (
                <ErrorState
                    message="Impossible de charger la liste des clubs."
                    onRetry={refetch}
                />
            )}

            <FlatList
                data={clubs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <ClubCard club={item} onPress={() => {
                        Keyboard.dismiss();
                        handleClubPress(item.id)
                    }} />
                )}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={{ paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT }}
                scrollEnabled={!!clubs && clubs.length > 0}
            />
        </KeyboardAvoidingView>
    );
};

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
        marginTop: 24,
    },
    emptyContainer: {
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        textAlign: "center",
    },
});

export default SearchClubScreen;
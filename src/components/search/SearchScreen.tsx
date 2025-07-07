import React, { useState, useRef } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
    Text,
    Keyboard,
} from "react-native";
import { useDebounce } from "use-debounce";
import { useSearchTeams } from "@/src/hooks/team/useSearchTeams";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { ErrorState } from "@/src/components/common/feedback/ErrorState";
import TeamCard from "@/src/components/search/components/TeamCard";
import * as Haptics from "expo-haptics";
import TeamContainer from "@/src/components/team/TeamScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetFlatList, BottomSheetView, BottomSheetModal } from "@gorhom/bottom-sheet";
import { SearchPrompt } from "../common/feedback/SearchPrompt";
import BottomSheetCustomPage from "../common/BottomSheetCustomPage";
import SearchBar from "../common/SearchBar";

const SearchScreen: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const [search, setSearch] = useState("");
    const [debouncedQuery] = useDebounce(search, 300);
    const { data: teams, isLoading, isError } = useSearchTeams(debouncedQuery);

    const teamSheetRef = useRef<BottomSheetModal>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [isInputFocused, setIsInputFocused] = useState(false);

    const openTeamSheet = (id: number) => {
        Haptics.selectionAsync();
        setSelectedTeamId(id);
        teamSheetRef.current?.present();
    };

    const renderEmpty = () => {
        if (!search && !isInputFocused) return <SearchPrompt />;
        if (debouncedQuery.length > 1 && !isLoading && !isError) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textInactive }]}>
                        Aucune équipe trouvée pour cette recherche.
                    </Text>
                </View>
            );
        }
        return null;
    };

    return (
        <>
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: theme.background }]}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.searchRow}>
                    <SearchBar
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Rechercher une équipe..."
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                    />
                </View>

                {isLoading && (
                    <ActivityIndicator size="small" color={theme.text} style={styles.loader} />
                )}

                {isError && (
                    <ErrorState message="Une erreur est survenue. Réessaie plus tard." />
                )}

                <BottomSheetFlatList
                    data={teams}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={!!(search && teams?.length)}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TeamCard team={item} onPress={() => openTeamSheet(item.id)} />
                    )}
                    ListEmptyComponent={renderEmpty}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={Keyboard.dismiss}
                    contentContainerStyle={{ paddingBottom: insets.bottom }}
                />
            </KeyboardAvoidingView>

            <BottomSheetCustomPage ref={teamSheetRef}>
                <BottomSheetView style={{ flex: 1 }}>
                    {selectedTeamId && <TeamContainer teamId={selectedTeamId} />}
                </BottomSheetView>
            </BottomSheetCustomPage>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    searchRow: {
        marginVertical: 16,
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

export default SearchScreen;
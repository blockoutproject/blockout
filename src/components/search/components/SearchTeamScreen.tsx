import React, { useState, useRef } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    Keyboard,
} from "react-native";
import { useDebounce } from "use-debounce";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { BottomSheetModal, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import SearchBar from "@/src/components/common/SearchBar";
import TeamCard from "@/src/components/search/components/TeamCard";
import TeamContainer from "@/src/components/team/TeamScreen";
import { SearchPrompt } from "@/src/components/common/feedback/SearchPrompt";
import { ErrorState } from "@/src/components/common/feedback/ErrorState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheetCustomPage from "@/src/components/common/BottomSheetCustomPage";
import * as Haptics from "expo-haptics";
import { useSearchTeams } from "@/src/hooks/search/useSearchTeams";

type Props = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
    isInputFocused: boolean;
    setIsInputFocused: (focused: boolean) => void;
};

const SearchTeamScreen: React.FC<Props> = ({
    search,
    debouncedQuery,
    setSearch,
    isInputFocused,
    setIsInputFocused,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const { data: teams, isLoading, isError } = useSearchTeams(debouncedQuery);

    const teamSheetRef = useRef<BottomSheetModal>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

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
                    renderItem={({ item }) => (
                        <TeamCard team={item} onPress={() => {
                            Keyboard.dismiss();
                            openTeamSheet(item.id)
                        }}/>
                    )}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={Keyboard.dismiss}
                    contentContainerStyle={{ paddingBottom: insets.bottom }}
                />
            </KeyboardAvoidingView>

            <BottomSheetCustomPage ref={teamSheetRef}>
                {selectedTeamId && <TeamContainer teamId={selectedTeamId} />}
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

export default SearchTeamScreen;
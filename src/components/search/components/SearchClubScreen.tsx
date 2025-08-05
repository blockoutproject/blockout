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
import { useAppTheme } from "@/src/context/ThemeProvider";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import SearchBar from "@/src/components/common/SearchBar";
import ClubCard from "@/src/components/search/components/ClubCard";
import ClubContainer from "@/src/components/club/ClubScreen";
import { SearchPrompt } from "@/src/components/common/feedback/SearchPrompt";
import { ErrorState } from "@/src/components/common/feedback/ErrorState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheetCustomPage from "@/src/components/common/BottomSheetCustomPage";
import * as Haptics from "expo-haptics";
import { useSearchClubs } from "@/src/hooks/search/useSearchClubs";
import { FlatList } from "react-native-gesture-handler";

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

    const { data: clubs, isLoading, isError } = useSearchClubs(debouncedQuery);

    const clubSheetRef = useRef<BottomSheetModal>(null);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

    const openClubSheet = (id: string) => {
        Haptics.selectionAsync();
        setSelectedClubId(id);
        clubSheetRef.current?.present();
    };

    const renderEmpty = () => {
        if (!search && !isInputFocused) return <SearchPrompt />;
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
        <>
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
                    />
                </View>

                {isLoading && (
                    <ActivityIndicator size="small" color={theme.text} style={styles.loader} />
                )}

                {isError && (
                    <ErrorState message="Une erreur est survenue. Réessaie plus tard." />
                )}

                <BottomSheetFlatList
                    data={clubs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <ClubCard club={item} onPress={() => {
                            Keyboard.dismiss();
                            openClubSheet(item.id)
                        }}/>
                    )}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={Keyboard.dismiss}
                    contentContainerStyle={{ paddingBottom: insets.bottom }}
                />
            </KeyboardAvoidingView>

            <BottomSheetCustomPage ref={clubSheetRef}>
                {selectedClubId && <ClubContainer clubId={selectedClubId} />}
            </BottomSheetCustomPage>
        </>
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
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
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import SearchBar from "@/src/components/common/SearchBar";
import ClubCard from "@/src/components/search/components/ClubCard";
import { SearchPrompt } from "@/src/components/common/feedback/SearchPrompt";
import { ErrorState } from "@/src/components/common/feedback/ErrorState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useSearchClubs } from "@/src/hooks/search/useSearchClubs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SheetStackParamList } from "../../common/BottomSheetNavigator";

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
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();

    const handleClubPress = (clubId: string) => {
        Haptics.selectionAsync();
        navigation.push("Club", { clubId });
    }

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
                        handleClubPress(item.id)
                    }} />
                )}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={{ paddingBottom: insets.bottom }}
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
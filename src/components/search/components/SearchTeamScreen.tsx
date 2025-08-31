import React from "react";
import {
    KeyboardAvoidingView,
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    Keyboard,
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import SearchBar from "@/src/components/common/SearchBar";
import TeamCard from "@/src/components/search/components/TeamCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useSearchTeams } from "@/src/hooks/search/useSearchTeams";
import { FlatList } from "react-native-gesture-handler";
import ErrorState from "../../common/feedback/ErrorState";
import { useRouter } from "expo-router";
import SearchState from "../../common/feedback/SearchState.tsx";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";


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
    setIsInputFocused
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { data: teams, isLoading, isError, refetch } = useSearchTeams(debouncedQuery);

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        router.push(`/teams/${teamId}`);
    };

    const renderEmpty = () => {
        if (!search && !isInputFocused) return <SearchState />;
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
                    inSheet={false}
                />
            </View>

            {isLoading && (
                <ActivityIndicator size="small" color={theme.text} style={styles.loader} />
            )}

            {isError && (
                <ErrorState
                    message="Impossible de charger la liste des équipes."
                    onRetry={refetch}
                />
            )}

            <FlatList
                data={teams}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TeamCard team={item} onPress={() => {
                        Keyboard.dismiss();
                        handleTeamPress(item.id)
                    }} />
                )}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={{ paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT }}
                scrollEnabled={!!teams && teams.length > 0}
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
        marginTop: 8,
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
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
import TeamCard from "@/src/components/search/TeamCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useSearchTeams } from "@/src/hooks/search/useSearchTeams";
import { FlatList } from "react-native-gesture-handler";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import { useRouter } from "expo-router";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";

export type SearchTeamScreenProps = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
};

const SearchTeamScreen: React.FC<SearchTeamScreenProps> = ({
    search,
    debouncedQuery,
    setSearch,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const triggerOnEmpty = search.length === 0;

    const { data: teams, isLoading, isError, refetch } = useSearchTeams(
        debouncedQuery,
        triggerOnEmpty
    );

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        router.push(`/teams/${teamId}`);
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
                        Aucune équipe trouvée pour cette recherche.
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
            testID="search-team-screen"
        >
            <View style={styles.searchRow}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Rechercher une équipe..."
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
                    subtitle="Impossible de charger la liste des équipes."
                    onRetry={refetch}
                />
            )}

            <FlatList
                data={teams}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TeamCard
                        team={item}
                        onPress={() => {
                            Keyboard.dismiss();
                            handleTeamPress(item.id);
                        }}
                    />
                )}
                ListEmptyComponent={renderEmpty}
                ListHeaderComponent={
                    search.length === 0 && teams && teams.length > 0 ? (
                        <Text
                            style={[
                                styles.exampleLabel,
                                { color: theme.textInactive },
                            ]}
                        >
                            Exemples d’équipes
                        </Text>
                    ) : null
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={[
                    { paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT },
                ]}
                scrollEnabled={Boolean(teams && teams.length > 0)}
                testID="search-team-list"
            />
        </KeyboardAvoidingView>
    );
};

export default SearchTeamScreen;

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
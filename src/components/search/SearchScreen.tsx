import React, { useState } from 'react';
import {
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
    Text,
    Keyboard,
} from 'react-native';
import { useDebounce } from 'use-debounce';
import { useSearchTeams } from '@/src/hooks/team/useSearchTeams';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { ErrorState } from '@/src/components/common/feedback/ErrorState';
import TeamCard from '@/src/components/search/TeamCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TeamContainer from '@/src/components/team/TeamScreen';
import { useGlobalBottomSheet } from '@/src/context/GlobalBottomSheetProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { SearchPrompt } from '../common/feedback/SearchPrompt';

const SearchScreen = () => {
    const theme = useAppTheme();
    const { openSheet } = useGlobalBottomSheet();
    const insets = useSafeAreaInsets();

    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);

    const { data: teams, isLoading, isError } = useSearchTeams(debouncedQuery);

    const handleTeamPress = (teamId: number) => {
        Haptics.selectionAsync();
        openSheet(<TeamContainer teamId={teamId} />);
    };

    const renderEmpty = () => {
        if (!query) return <SearchPrompt />;
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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.topRow}>
                <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={20}
                        color={theme.textInactive}
                        style={styles.icon}
                    />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Rechercher une équipe..."
                        placeholderTextColor={theme.textInactive}
                        style={[styles.input, { color: theme.text }]}
                        returnKeyType="search"
                        autoFocus
                        clearButtonMode="while-editing"
                    />
                </View>
            </View>

            {isLoading && (
                <ActivityIndicator
                    size="small"
                    color={theme.text}
                    style={styles.loader}
                />
            )}

            {isError && <ErrorState message="Une erreur est survenue. Réessaie plus tard." />}

            <BottomSheetFlatList
                data={teams}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={!!(query && teams?.length)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TeamCard team={item} onPress={() => handleTeamPress(item.id)} />
                )}
                ListEmptyComponent={renderEmpty}
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
        paddingHorizontal: 16,
    },
    topRow: {
        marginVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 0,
        fontSize: 14,
    },
    icon: {
        marginHorizontal: 6,
    },
    loader: {
        marginTop: 24,
    },
    emptyContainer: {
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
});

export default SearchScreen;
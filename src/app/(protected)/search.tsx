import React, { useState } from 'react';
import {
    TextInput,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDebounce } from 'use-debounce';
import { useSearchTeams } from '@/src/hooks/team/useSearchTeams';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { ErrorState } from '@/src/components/search/ErrorState';
import { EmptyList } from '@/src/components/search/EmptyList';
import TeamCard from '@/src/components/search/TeamCard';
import { SearchPrompt } from '@/src/components/search/SearchPrompt';

const SearchScreen = () => {
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const router = useRouter();
    const theme = useAppTheme();

    const { data: teams, isLoading, isError } = useSearchTeams(debouncedQuery);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <TextInput
                placeholder="🔍 Rechercher une équipe..."
                value={query}
                onChangeText={setQuery}
                placeholderTextColor={theme.textInactive}
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
            />

            {isLoading && (
                <ActivityIndicator size="large" style={styles.loader} color={theme.text} />
            )}

            {isError && <ErrorState message="Une erreur est survenue. Réessaie plus tard." />}

            <FlatList
                data={teams}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={!!query}
                renderItem={({ item }) => (
                    <TeamCard team={item} onPress={() => router.push(`/team/${item.id}`)} />
                )}
                contentContainerStyle={{
                    paddingTop: 16,
                }}
                ListEmptyComponent={
                    !query ? (
                        <SearchPrompt />
                    ) : debouncedQuery.length > 1 && !isLoading && !isError ? (
                        <EmptyList message="Aucune équipe trouvée pour cette recherche." />
                    ) : null
                }
                keyboardShouldPersistTaps="handled"
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
    },
    loader: {
        marginTop: 24,
    },
});

export default SearchScreen;
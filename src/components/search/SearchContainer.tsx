import React, { useState } from 'react';
import {
    TextInput,
    Text,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
    TouchableOpacity,
    Keyboard,
} from 'react-native';
import { useDebounce } from 'use-debounce';
import { useSearchTeams } from '@/src/hooks/team/useSearchTeams';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { ErrorState } from '@/src/components/search/ErrorState';
import { EmptyList } from '@/src/components/search/EmptyList';
import TeamCard from '@/src/components/search/TeamCard';
import { SearchPrompt } from '@/src/components/search/SearchPrompt';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TeamContainer from '@/src/components/team/TeamContainer';
import { useGlobalBottomSheet } from '@/src/context/GlobalBottomSheetProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';

const SearchContainer = () => {
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

            {isLoading && <ActivityIndicator size="large" style={styles.loader} color={theme.text} />}

            {isError && <ErrorState message="Une erreur est survenue. Réessaie plus tard." />}

            <BottomSheetFlatList
                data={teams}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={!!query}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TeamCard team={item} onPress={() => handleTeamPress(item.id)} />
                )}
                ListEmptyComponent={
                    !query ? (
                        <SearchPrompt />
                    ) : debouncedQuery.length > 1 && !isLoading && !isError ? (
                        <EmptyList message="Aucune équipe trouvée pour cette recherche." />
                    ) : null
                }
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
    clearIcon: {
        marginLeft: 8,
    },
    cancelButton: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    loader: {
        marginTop: 24,
    },
});

export default SearchContainer;
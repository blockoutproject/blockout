import React from 'react';
import {
    KeyboardAvoidingView,
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    Keyboard,
    Platform,
} from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import SearchBar from '@/src/components/common/SearchBar';
import { SearchPrompt } from '@/src/components/common/feedback/SearchPrompt';
import { ErrorState } from '@/src/components/common/feedback/ErrorState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SheetStackParamList } from '@/src/components/common/BottomSheetNavigator';
import PoolCard from './PoolCard';
import { useSearchPools } from '@/src/hooks/search/useSearchPools';

type Props = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
    isInputFocused: boolean;
    setIsInputFocused: (focused: boolean) => void;
};

const SearchPoolScreen: React.FC<Props> = ({
    search,
    debouncedQuery,
    setSearch,
    isInputFocused,
    setIsInputFocused
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();
    const { data: pools, isLoading, isError } = useSearchPools(debouncedQuery);

    const handlePoolPress = (poolId: number) => {
        Haptics.selectionAsync();
        navigation.push('Pool', { poolId });
    };

    const renderEmpty = () => {
        if (!search && !isInputFocused) return <SearchPrompt />;
        if (debouncedQuery.length > 1 && !isLoading && !isError) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textInactive }]}>
                        Aucune poule trouvée pour cette recherche.
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
            <View style={styles.searchRow}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Rechercher une poule..."
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
                data={pools}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <PoolCard
                        pool={item}
                        onPress={() => {
                            Keyboard.dismiss();
                            handlePoolPress(item.id);
                        }}
                    />
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
        flexDirection: 'row',
        alignItems: 'center',
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

export default SearchPoolScreen;
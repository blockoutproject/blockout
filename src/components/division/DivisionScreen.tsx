import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { useDivisions } from '@/src/hooks/config/division/useDivisions';
import { Division } from '@/src/types/Division';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DivisionForm from './DivisionForm';
import { useGlobalBottomSheet } from '@/src/context/GlobalBottomSheetProvider';
import DivisionItem from './DivisionItem';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';

const DivisionScreen = () => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { data, isLoading, refetch } = useDivisions();
    const { openPopup, closeSheetById } = useGlobalBottomSheet();

    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        return (data || []).filter((d) =>
            d.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [data, search]);

    const handleOpenForm = (division: Division | null) => {
        const sheetId = openPopup(
            <DivisionForm
                division={division}
                onSuccess={() => {
                    refetch();
                    closeSheetById(sheetId);
                }}
            />
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.headerRow}>
                <TextInput
                    placeholder="Rechercher une division"
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.searchInput, { borderColor: theme.border, color: theme.text }]}
                    placeholderTextColor={theme.textInactive}
                />
                <TouchableOpacity onPress={() => handleOpenForm(null)}>
                    <MaterialCommunityIcons name="plus" size={28} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <BottomSheetFlatList
                data={filtered}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                renderItem={({ item }) => (
                    <DivisionItem
                        division={item}
                        onPress={() => handleOpenForm(item)}
                        onDeactivated={refetch}
                    />
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        fontSize: 14,
    },
    item: {
        padding: 16,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemText: {
        fontSize: 16,
        fontWeight: '600',
    },
    itemSub: {
        fontSize: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default DivisionScreen;
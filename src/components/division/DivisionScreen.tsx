import React, { useState, useMemo, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useDivisions } from "@/src/hooks/config/division/useDivisions";
import { Division } from "@/src/types/Division";
import { Filter } from "@/src/types/Filter";
import Filters from "../home/Filters";
import DivisionItem from "./DivisionItem";
import DivisionForm from "./DivisionForm";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheetCustomModal from "../common/BottomSheetCustomModal";
import SearchBar from "../common/SearchBar";
import * as Haptics from "expo-haptics"; // ← import haptic

const DivisionScreen = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { data, isLoading, refetch } = useDivisions();

    const formSheetRef = useRef<BottomSheetModal>(null);
    const [editedDivision, setEditedDivision] = useState<Division | null>(null);

    const openForm = (division: Division | null) => {
        Haptics.selectionAsync(); // ← haptic feedback
        setEditedDivision(division);
        formSheetRef.current?.present();
    };

    const closeForm = () => formSheetRef.current?.dismiss();

    const [search, setSearch] = useState("");
    const [statusFilters, setStatusFilters] = useState<Filter[]>([
        { name: "Actives", isActive: false },
        { name: "Inactives", isActive: false },
    ]);

    const activeStatus = statusFilters.find((f) => f.isActive)?.name ?? "";

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter((d) => {
            const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
            const matchStatus =
                activeStatus === "" ||
                (activeStatus === "Actives" && d.active) ||
                (activeStatus === "Inactives" && !d.active);
            return matchSearch && matchStatus;
        });
    }, [data, search, activeStatus]);

    const sorted = useMemo(
        () => [...filteredData].sort((a, b) => a.id - b.id),
        [filteredData]
    );

    if (isLoading || !data) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    }

    return (
        <>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.searchRow}>
                    <SearchBar
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Rechercher une division..."
                    />
                    <TouchableOpacity
                        onPress={() => openForm(null)}
                        style={[styles.addButton, { backgroundColor: theme.success }]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.addButtonText}>Ajouter</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.filtersWrapper}>
                    <View style={styles.filterGroup}>
                        <Filters
                            filters={statusFilters}
                            setFilters={setStatusFilters}
                            singleSelect
                        />
                    </View>
                </View>

                <BottomSheetFlatList
                    style={styles.flatList}
                    data={sorted}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <DivisionItem
                            division={item}
                            onPress={() => openForm(item)}
                            onDeactivated={refetch}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={{ color: theme.textInactive }}>
                                Aucun résultat trouvé.
                            </Text>
                        </View>
                    }
                    onScrollBeginDrag={Keyboard.dismiss}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            <BottomSheetCustomModal ref={formSheetRef}>
                <DivisionForm
                    division={editedDivision}
                    onSuccess={async () => {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        refetch();
                        closeForm();
                    }}
                />
            </BottomSheetCustomModal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 8,
        marginVertical: 16,
        gap: 12,
    },
    addButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 18,
    },
    addButtonText: {
        flex: 1,
        color: "white",
        fontWeight: "bold",
    },
    filtersWrapper: {
        paddingHorizontal: 8,
    },
    filterGroup: {
        marginBottom: 12,
    },
    flatList: {
        paddingHorizontal: 8,
    },
    emptyState: {
        alignItems: "center",
        marginTop: 32,
    },
});

export default DivisionScreen;
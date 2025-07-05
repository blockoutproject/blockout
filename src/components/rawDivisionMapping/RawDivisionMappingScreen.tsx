import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useRawDivisionMappings } from "@/src/hooks/config/rawDivisionMapping/useRawDivisionMapping";
import { RawDivisionMapping } from "@/src/types/RawDivisionMapping";
import { Filter } from "@/src/types/Filter";
import Filters from "../home/Filters";
import RawDivisionMappingItem from "./RawDivisionMappingItem";
import RawDivisionMappingForm from "./RawDivisionMappingForm";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheetCustomModal from "../common/BottomSheetCustomModal";
import SearchBar from "../common/SearchBar";

type FilterName = string;

const mergeFilters = (nextNames: FilterName[], prevFilters: Filter[]): Filter[] => {
    const prevState = new Map(prevFilters.map((f) => [f.name, f.isActive]));
    return nextNames.map((name) => ({
        name,
        isActive: prevState.get(name) ?? false,
    }));
};

const RawDivisionMappingScreen: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { data, isLoading, refetch } = useRawDivisionMappings();

    const formSheetRef = useRef<BottomSheetModal>(null);
    const [editing, setEditing] = useState<RawDivisionMapping | null>(null);

    const openForm = (mapping: RawDivisionMapping) => {
        Keyboard.dismiss();
        setEditing(mapping);
        formSheetRef.current?.present();
    };
    const closeForm = () => formSheetRef.current?.dismiss();

    const [search, setSearch] = useState("");
    const [mappingFilters, setMappingFilters] = useState<Filter[]>([
        { name: "Mappés", isActive: false },
        { name: "Non mappés", isActive: false },
    ]);

    const leagueNames = useMemo(() => {
        return Array.from(new Set(data?.map((d) => d.leagueCode))).sort();
    }, [data]);

    const seasonNames = useMemo(() => {
        return Array.from(new Set(data?.map((d) => d.season))).sort((a, b) => b - a);
    }, [data]);

    const [leagueFilters, setLeagueFilters] = useState<Filter[]>(
        leagueNames.map((name) => ({ name, isActive: false }))
    );
    const [seasonFilters, setSeasonFilters] = useState<Filter[]>(
        seasonNames.map((s) => ({ name: s.toString(), isActive: false }))
    );

    useEffect(() => {
        setLeagueFilters((prev) => mergeFilters(leagueNames, prev));
    }, [leagueNames]);

    useEffect(() => {
        setSeasonFilters((prev) => mergeFilters(seasonNames.map((s) => s.toString()), prev));
    }, [seasonNames]);

    const activeMapping = mappingFilters.find((f) => f.isActive)?.name ?? "";
    const activeLeagues = leagueFilters.filter((f) => f.isActive).map((f) => f.name);
    const activeSeasons = seasonFilters.filter((f) => f.isActive).map((f) => f.name);

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter((item) => {
            const txt = item.rawDivisionName.toLowerCase();
            const matchesSearch = txt.includes(search.toLowerCase());
            const isMapped = item.divisionId && item.format && item.gender;

            const matchesMapping =
                activeMapping === "" ||
                (activeMapping === "Mappés" && isMapped) ||
                (activeMapping === "Non mappés" && !isMapped);

            const matchesLeague =
                activeLeagues.length === 0 || activeLeagues.includes(item.leagueCode);

            const matchesSeason =
                activeSeasons.length === 0 ||
                activeSeasons.includes(item.season.toString());

            return matchesSearch && matchesMapping && matchesLeague && matchesSeason;
        });
    }, [data, search, activeMapping, activeLeagues, activeSeasons]);

    const sortedData = useMemo(
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
                        placeholder="Rechercher par nom brut..."
                    />
                </View>
                <View style={styles.filterWrapper}>
                    <Filters filters={mappingFilters} setFilters={setMappingFilters} singleSelect />
                    <Filters filters={leagueFilters} setFilters={setLeagueFilters} />
                    <Filters filters={seasonFilters} setFilters={setSeasonFilters} />
                </View>

                <BottomSheetFlatList
                    style={styles.flatList}
                    data={sortedData}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <RawDivisionMappingItem mapping={item} onPress={() => openForm(item)} />
                    )}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={{ color: theme.textInactive }}>
                                Aucun résultat correspondant.
                            </Text>
                        </View>
                    }
                    keyboardShouldPersistTaps="handled"
                    onScrollBeginDrag={Keyboard.dismiss}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            <BottomSheetCustomModal ref={formSheetRef}>
                {editing && (
                    <RawDivisionMappingForm
                        mapping={editing}
                        onSuccess={() => {
                            refetch();
                            closeForm();
                        }}
                    />
                )}
            </BottomSheetCustomModal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 8,
        marginVertical: 16,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    filterWrapper: {
        flexDirection: "column",
        gap: 12,
        marginBottom: 16,
    },
    flatList: {
        paddingHorizontal: 8,
    },
    emptyState: {
        alignItems: "center",
        marginTop: 32,
    },
});

export default RawDivisionMappingScreen;
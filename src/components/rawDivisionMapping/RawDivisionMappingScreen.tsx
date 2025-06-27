import React, { useState, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";
import RawDivisionMappingItem from "./RawDivisionMappingItem";
import { RawDivisionMapping } from "@/src/types/RawDivisionMapping";
import { Filter } from "@/src/types/Filter";
import Filters from "../home/Filters";
import { useRawDivisionMappings } from "@/src/hooks/config/rawDivisionMapping/useRawDivisionMapping";

const RawDivisionMappingsScreen = () => {
    const { data, isLoading, error, refetch } = useRawDivisionMappings();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    const [search, setSearch] = useState("");

    const [mappingFilters, setMappingFilters] = useState<Filter[]>([
        { name: "Mappés", isActive: false },
        { name: "Non mappés", isActive: false },
    ]);

    const leagues = useMemo(() => {
        const unique = Array.from(new Set(data?.map((d) => d.leagueCode))).sort();
        return unique.map((name) => ({ name, isActive: false }));
    }, [data]);
    const [leagueFilters, setLeagueFilters] = useState<Filter[]>(leagues);

    const seasons = useMemo(() => {
        const unique = Array.from(new Set(data?.map((d) => d.season))).sort((a, b) => b - a);
        return unique.map((s) => ({ name: s.toString(), isActive: false }));
    }, [data]);
    const [seasonFilters, setSeasonFilters] = useState<Filter[]>(seasons);

    const activeMapping = mappingFilters.find((f) => f.isActive)?.name ?? "";
    const activeLeagues = leagueFilters.filter((f) => f.isActive).map((f) => f.name);
    const activeSeasons = seasonFilters.filter((f) => f.isActive).map((f) => f.name);

    const filteredData = useMemo(() => {
        if (!data) return [];

        return data.filter((item: RawDivisionMapping) => {
            const matchesSearch = item.rawDivisionName.toLowerCase().includes(search.toLowerCase());
            const isMapped = item.divisionCode && item.format && item.gender;

            const matchesMapping =
                activeMapping === "" ||
                (activeMapping === "Mappés" && isMapped) ||
                (activeMapping === "Non mappés" && !isMapped);

            const matchesLeague = activeLeagues.length === 0 || activeLeagues.includes(item.leagueCode);
            const matchesSeason = activeSeasons.length === 0 || activeSeasons.includes(item.season.toString());

            return matchesSearch && matchesMapping && matchesLeague && matchesSeason;
        });
    }, [data, search, activeMapping, activeLeagues, activeSeasons]);

    const sortedData = useMemo(() => [...filteredData].sort((a, b) => a.id - b.id), [filteredData]);

    if (isLoading || !data) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.filtersWrapper}>
                <TextInput
                    placeholder="Rechercher par nom brut..."
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.searchInput, { borderColor: theme.border, color: theme.text }]}
                    placeholderTextColor={theme.textInactive}
                />

                <View style={styles.filterGroup}>
                    <Filters filters={mappingFilters} setFilters={setMappingFilters} singleSelect />
                </View>

                <View style={styles.filterGroup}>
                    <Filters filters={leagueFilters} setFilters={setLeagueFilters} />
                </View>

                <View style={styles.filterGroup}>
                    <Filters filters={seasonFilters} setFilters={setSeasonFilters} />
                </View>
            </View>

            <FlatList
                style={styles.flatList}
                data={sortedData}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <RawDivisionMappingItem mapping={item} onUpdated={refetch} />}
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            />
        </View>
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
    filtersWrapper: {
        paddingTop: 16,
    },
    searchInput: {
        borderWidth: 1,
        borderRadius: 18,
        marginHorizontal: 8,
        padding: 10,
        fontSize: 14,
        marginBottom: 12,
    },
    filterGroup: {
        marginBottom: 12,
    },
    flatList: {
        paddingHorizontal: 8,
    },
});

export default RawDivisionMappingsScreen;
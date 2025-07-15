import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import Filters from "@/src/components/common/Filters";
import { Filter } from "@/src/types/Filter";
import SearchTeamScreen from "./components/SearchTeamScreen";
import SearchClubScreen from "./components/SearchClubScreen";
import { useDebounce } from "use-debounce";

const SearchScreen: React.FC = () => {
    const [search, setSearch] = useState("");
    const [debouncedQuery] = useDebounce(search, 300);
    const [isInputFocused, setIsInputFocused] = useState(false);

    const [entityFilters, setEntityFilters] = useState<Filter[]>([
        { name: "Équipes", isActive: true },
        { name: "Clubs", isActive: false },
    ]);

    const activeIndex = entityFilters.findIndex((f) => f.isActive);
    const activeEntity = entityFilters[activeIndex]?.name ?? "Équipes";

    return (
        <View style={styles.container}>
            <View style={styles.filterRow}>
                <Filters
                    filters={entityFilters}
                    setFilters={setEntityFilters}
                    singleSelect
                />
            </View>

            {activeEntity === "Équipes" ? (
                <SearchTeamScreen
                    search={search}
                    debouncedQuery={debouncedQuery}
                    setSearch={setSearch}
                    isInputFocused={isInputFocused}
                    setIsInputFocused={setIsInputFocused}
                />
            ) : (
                <SearchClubScreen
                    search={search}
                    debouncedQuery={debouncedQuery}
                    setSearch={setSearch}
                    isInputFocused={isInputFocused}
                    setIsInputFocused={setIsInputFocused}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterRow: {
        marginTop: 12,
        marginHorizontal: 12,
    },
});

export default SearchScreen;
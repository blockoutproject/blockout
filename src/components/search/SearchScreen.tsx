import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useDebounce } from "use-debounce";

import SearchTeamScreen from "@/src/components/search/components/SearchTeamScreen";
import SearchClubScreen from "@/src/components/search/components/SearchClubScreen";
import SearchPoolScreen from "@/src/components/search/components/SearchPoolScreen";
import SearchHeader from "@/src/components/search/components/SearchHeader";
import { Filter } from "@/src/types/Filter";

type Props = {
    onCloseSheet: () => void;
};

const SearchScreen: React.FC<Props> = ({ onCloseSheet }) => {
    const [filters, setFilters] = useState<Filter[]>([
        { name: "Équipes", isActive: true },
        { name: "Clubs", isActive: false },
        { name: "Poules", isActive: false },
    ]);
    const [search, setSearch] = useState("");
    const [debouncedQuery] = useDebounce(search, 300);
    const [isInputFocused, setIsInputFocused] = useState(false);

    const activeIndex = filters.findIndex((f) => f.isActive);
    const activeEntity = filters[activeIndex]?.name ?? "Équipes";

    return (
        <View style={styles.container}>
            <SearchHeader onCloseSheet={onCloseSheet} filters={filters} setFilters={setFilters} />

            {activeEntity === "Équipes" ? (
                <SearchTeamScreen
                    search={search}
                    debouncedQuery={debouncedQuery}
                    setSearch={setSearch}
                    isInputFocused={isInputFocused}
                    setIsInputFocused={setIsInputFocused}
                />
            ) : activeEntity === "Clubs" ? (
                <SearchClubScreen
                    search={search}
                    debouncedQuery={debouncedQuery}
                    setSearch={setSearch}
                    isInputFocused={isInputFocused}
                    setIsInputFocused={setIsInputFocused}
                />
            ) : (
                <SearchPoolScreen
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
    container: { flex: 1 },
});

export default SearchScreen;
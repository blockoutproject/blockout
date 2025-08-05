import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useDebounce } from "use-debounce";

import SearchTeamScreen from "@/src/components/search/components/SearchTeamScreen";
import SearchClubScreen from "@/src/components/search/components/SearchClubScreen";

import type { Filter } from "@/src/types/Filter";

type Props = {
    filters: Filter[];
    setFilters: (updated: Filter[]) => void; // gardé pour symétrie, pas utilisé ici
};

const SearchScreen: React.FC<Props> = ({ filters }) => {
    const [search, setSearch] = useState("");
    const [debouncedQuery] = useDebounce(search, 300);
    const [isInputFocused, setIsInputFocused] = useState(false);

    const activeIndex = filters.findIndex((f) => f.isActive);
    const activeEntity = filters[activeIndex]?.name ?? "Équipes";

    return (
        <View style={styles.container}>
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
        flex: 1
    },
});

export default SearchScreen;
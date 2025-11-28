import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useDebounce } from "use-debounce";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import SearchTeamScreen from "@/src/components/search/SearchTeamScreen";
import SearchClubScreen from "@/src/components/search/SearchClubScreen";
import SearchPoolScreen from "@/src/components/search/SearchPoolScreen";
import SearchHeader from "@/src/components/search/SearchHeader";
import { ReportType } from "@/src/types/Report";
import { Filter } from "@/src/types/Filter";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";

const SearchScreen: React.FC = () => {
    const [filters, setFilters] = useState<Filter[]>([
        { name: "Équipes", isActive: true },
        { name: "Clubs", isActive: false },
        { name: "Poules", isActive: false },
    ]);
    const [search, setSearch] = useState("");
    const [debouncedQuery] = useDebounce(search, 300);

    const activeIndex = filters.findIndex((f) => f.isActive);
    const activeEntity = filters[activeIndex]?.name ?? "Équipes";

    const reportSheetRef = useRef<BottomSheetModal>(null);

    return (
        <View
            style={styles.container}
            testID="search-screen"
        >
            <SearchHeader
                filters={filters}
                setFilters={setFilters}
                onOpenReport={() => reportSheetRef.current?.present()}
            />

            {activeEntity === "Équipes" ? (
                <SearchTeamScreen
                    search={search}
                    debouncedQuery={debouncedQuery}
                    setSearch={setSearch}
                />
            ) : activeEntity === "Clubs" ? (
                <SearchClubScreen
                    search={search}
                    debouncedQuery={debouncedQuery}
                    setSearch={setSearch}
                />
            ) : (
                <SearchPoolScreen
                    search={search}
                    debouncedQuery={debouncedQuery}
                    setSearch={setSearch}
                />
            )}

            <ReportFormSheet
                ref={reportSheetRef}
                context={{ screen: `Search#${activeEntity}`, defaultType: ReportType.DISPLAY_BUG }}
                onSuccess={() => {
                    reportSheetRef.current?.dismiss();
                }}
                snapPoint="90%"
                footerLabel="Envoyer"
            />
        </View>
    );
};

export default SearchScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
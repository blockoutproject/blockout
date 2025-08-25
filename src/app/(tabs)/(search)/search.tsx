import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useDebounce } from "use-debounce";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import SearchTeamScreen from "@/src/components/search/components/SearchTeamScreen";
import SearchClubScreen from "@/src/components/search/components/SearchClubScreen";
import SearchPoolScreen from "@/src/components/search/components/SearchPoolScreen";
import SearchHeader from "@/src/components/search/components/SearchHeader";
import BottomSheetCustomModal from "@/src/components/common/BottomSheetCustomModal";
import ReportForm from "@/src/components/report/ReportForm";
import { ReportType } from "@/src/types/Report";
import { Filter } from "@/src/types/Filter";


const SearchScreen: React.FC = () => {
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

    // Report modal
    const reportSheetRef = useRef<BottomSheetModal>(null);

    return (
        <View style={styles.container}>
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

            <BottomSheetCustomModal
                ref={reportSheetRef}
                snapPoint={"90%"}
            >
                <ReportForm
                    context={{
                        screen: "Search",
                        defaultType: ReportType.DISPLAY_BUG,
                    }}
                    onSuccess={() => {
                        reportSheetRef.current?.dismiss();
                    }}
                />
            </BottomSheetCustomModal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
});

export default SearchScreen;
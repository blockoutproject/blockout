import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useDebounce } from "use-debounce";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import SearchTeamScreen from "@/src/modules/search/ui/search-team-screen";
import SearchClubScreen from "@/src/modules/search/ui/search-club-screen";
import SearchPoolScreen from "@/src/modules/search/ui/search-pool-screen";
import SearchHeader from "@/src/modules/search/ui/search-header";
import { ReportTypeEnum } from "@/src/shared/generated/models";
import { Filter } from "@/src/shared/view-models/filter";
import ReportFormSheet from "@/src/modules/report/ui/report-form-sheet";

const SearchScreen: React.FC = () => {
  const [filters, setFilters] = useState<Filter[]>([
    { name: "Équipes", isActive: true },
    { name: "Poules", isActive: false },
    { name: "Clubs", isActive: false },
  ]);
  const [search, setSearch] = useState("");
  const [debouncedQuery] = useDebounce(search, 300);

  const activeIndex = filters.findIndex((f) => f.isActive);
  const activeEntity = filters[activeIndex]?.name ?? "Équipes";

  const reportSheetRef = useRef<BottomSheetModal>(null);

  return (
    <View style={styles.container} testID="search-screen">
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
        context={{
          screen: `Search#${activeEntity}`,
          defaultType: ReportTypeEnum.DISPLAY_BUG,
        }}
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

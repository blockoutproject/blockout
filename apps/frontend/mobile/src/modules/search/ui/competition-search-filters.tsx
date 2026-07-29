import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import DivisionSelect from "@/src/modules/search/ui/division-select";
import FormatSelect from "@/src/modules/search/ui/format-select";
import GenderSelect from "@/src/modules/search/ui/gender-select";
import type { CompetitionSearchFilters } from "@/src/modules/search/hooks/use-competition-search-filters";
import { spacing } from "@/src/shared/theme";
import SeasonSelect from "@/src/shared/ui/form/season-select";

export type CompetitionSearchFilterStripProps = {
  filters: CompetitionSearchFilters;
  testIDPrefix: "search-pool" | "search-team";
};

/** Renders the shared competition filter strip without owning query behavior. */
const CompetitionSearchFilterStrip = ({
  filters,
  testIDPrefix,
}: CompetitionSearchFilterStripProps) => (
  <ScrollView
    horizontal
    contentContainerStyle={styles.filters}
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
  >
    <SeasonSelect
      options={filters.seasonOptions}
      selectedValue={filters.selectedSeason}
      onValueChange={filters.setSelectedSeason}
      testID={`${testIDPrefix}-season-button`}
    />
    <DivisionSelect
      options={filters.divisionOptions}
      selectedValue={filters.selectedDivisionId}
      onValueChange={filters.setSelectedDivisionId}
      testID={`${testIDPrefix}-division-button`}
    />
    <FormatSelect
      selectedValue={filters.selectedFormat}
      onValueChange={filters.setSelectedFormat}
      testID={`${testIDPrefix}-format-button`}
    />
    <GenderSelect
      selectedValue={filters.selectedGender}
      onValueChange={filters.setSelectedGender}
      testID={`${testIDPrefix}-gender-button`}
    />
  </ScrollView>
);

export default CompetitionSearchFilterStrip;

const styles = StyleSheet.create({
  filters: {
    marginTop: spacing[1] + spacing.optical,
    gap: spacing[2],
    paddingRight: spacing[2],
  },
});

import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSearchPools } from "@/src/modules/search/hooks/use-search-pools";
import PoolCard from "@/src/modules/search/ui/pool-card";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import SearchResults from "@/src/modules/search/ui/search-results";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";
import DivisionSelect from "@/src/modules/search/ui/division-select";
import FormatSelect from "@/src/modules/search/ui/format-select";
import GenderSelect from "@/src/modules/search/ui/gender-select";
import SeasonSelect from "@/src/shared/ui/form/season-select";
import { useDivisions } from "@/src/modules/division/hooks/use-divisions";
import { FormatEnum } from "@/src/shared/view-models/format-labels";
import { GenderEnum } from "@/src/shared/view-models/gender-labels";
import { useNavigationInterstitial } from "@/src/modules/advertising/hooks/use-navigation-interstitial";

export type SearchPoolScreenProps = {
  search: string;
  debouncedQuery: string;
  setSearch: (text: string) => void;
};

const SEASONS: string[] = ["2026/2027", "2025/2026", "2024/2025"];

const SearchPoolScreen: React.FC<SearchPoolScreenProps> = ({
  search,
  debouncedQuery,
  setSearch,
}) => {
  const { handleNavigationWithAd } = useNavigationInterstitial();
  const { data: divisions } = useDivisions();

  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(
    null,
  );
  const [selectedFormat, setSelectedFormat] = useState<FormatEnum | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderEnum | null>(null);

  const seasonOptions: SelectOption<string>[] = useMemo(
    () => SEASONS.map((s) => ({ value: s, label: s })),
    [],
  );

  const divisionOptions: SelectOption<number>[] = useMemo(
    () =>
      (divisions ?? [])
        .filter((d) => d.active)
        .map((d) => ({
          value: d.id,
          label: d.name,
        })),
    [divisions],
  );

  const { data, isLoading, isError, refetch } = useSearchPools(
    debouncedQuery,
    selectedSeason ?? undefined,
    selectedDivisionId ?? undefined,
    selectedFormat ?? undefined,
    selectedGender ?? undefined,
  );

  const router = useRouter();

  const handlePoolPress = useCallback(
    async (poolId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/pool/${poolId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

  return (
    <SearchResults
      search={search}
      setSearch={setSearch}
      data={data}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      placeholder="Rechercher une poule..."
      exampleLabel="Exemples de poules"
      emptyMessage="Aucune poule trouvée pour cette recherche."
      renderItem={({ item }) => (
        <PoolCard pool={item} onPress={() => handlePoolPress(item.id)} />
      )}
      filters={
        <ScrollView
          horizontal
          contentContainerStyle={styles.filters}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SeasonSelect
            options={seasonOptions}
            selectedValue={selectedSeason}
            onValueChange={setSelectedSeason}
            testID="search-pool-season-button"
          />
          <DivisionSelect
            options={divisionOptions}
            selectedValue={selectedDivisionId}
            onValueChange={setSelectedDivisionId}
            testID="search-pool-division-button"
          />
          <FormatSelect
            selectedValue={selectedFormat}
            onValueChange={setSelectedFormat}
            testID="search-pool-format-button"
          />
          <GenderSelect
            selectedValue={selectedGender}
            onValueChange={setSelectedGender}
            testID="search-pool-gender-button"
          />
        </ScrollView>
      }
      testID="search-pool-results"
      inputTestID="search-pool-input"
      listTestID="search-pool-list"
    />
  );
};

export default SearchPoolScreen;

const styles = StyleSheet.create({
  filters: { marginTop: 6, gap: 8, paddingRight: 8 },
});

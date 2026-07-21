import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSearchPools } from "@/src/modules/search/hooks/useSearchPools";
import PoolCard from "@/src/modules/search/ui/PoolCard";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import SearchResults from "@/src/modules/search/ui/SearchResults";
import { SelectOption } from "@/src/shared/ui/form/SelectSheet";
import DivisionSelect from "@/src/shared/ui/form/DivisionSelect";
import FormatSelect from "@/src/shared/ui/form/FormatSelect";
import GenderSelect from "@/src/shared/ui/form/GenderSelect";
import SeasonSelect from "@/src/shared/ui/form/SeasonSelect";
import { useDivisions } from "@/src/modules/division/hooks/useDivisions";
import { EnumFormat } from "@/src/types/enums/Format";
import { EnumGender } from "@/src/types/enums/Gender";
import { useNavigationInterstitial } from "@/src/hooks/ads/useNavigationInterstitial";

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
  const [selectedFormat, setSelectedFormat] = useState<EnumFormat | null>(null);
  const [selectedGender, setSelectedGender] = useState<EnumGender | null>(null);

  const seasonOptions: SelectOption[] = useMemo(
    () => SEASONS.map((s) => ({ value: s, label: s })),
    [],
  );

  const divisionOptions: SelectOption[] = useMemo(
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

  const handleSelectSeason = useCallback((opt: SelectOption) => {
    setSelectedSeason(opt.value ? String(opt.value) : null);
  }, []);

  const handleSelectDivision = useCallback((opt: SelectOption) => {
    if (opt.value === "" || opt.value == null) {
      setSelectedDivisionId(null);
    } else {
      setSelectedDivisionId(Number(opt.value));
    }
  }, []);

  const handleSelectFormat = useCallback((opt: SelectOption) => {
    if (!opt.value) {
      setSelectedFormat(null);
    } else {
      setSelectedFormat(opt.value as EnumFormat);
    }
  }, []);

  const handleSelectGender = useCallback((opt: SelectOption) => {
    if (!opt.value) {
      setSelectedGender(null);
    } else {
      setSelectedGender(opt.value as EnumGender);
    }
  }, []);

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
            onSelect={handleSelectSeason}
            testIDButton="search-pool-season-button"
          />
          <DivisionSelect
            options={divisionOptions}
            selectedValue={selectedDivisionId}
            onSelect={handleSelectDivision}
            testIDButton="search-pool-division-button"
          />
          <FormatSelect
            selectedValue={selectedFormat}
            onSelect={handleSelectFormat}
            testIDButton="search-pool-format-button"
          />
          <GenderSelect
            selectedValue={selectedGender}
            onSelect={handleSelectGender}
            testIDButton="search-pool-gender-button"
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

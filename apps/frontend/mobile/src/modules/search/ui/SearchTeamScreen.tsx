import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSearchTeams } from "@/src/modules/search/hooks/useSearchTeams";
import TeamCard from "@/src/modules/search/ui/TeamCard";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import SearchResults from "@/src/modules/search/ui/SearchResults";
import { SelectOption } from "@/src/shared/ui/form/SelectSheet";
import DivisionSelect from "@/src/shared/ui/form/DivisionSelect";
import FormatSelect from "@/src/shared/ui/form/FormatSelect";
import GenderSelect from "@/src/shared/ui/form/GenderSelect";
import SeasonSelect from "@/src/shared/ui/form/SeasonSelect";
import { useDivisions } from "@/src/modules/division/hooks/useDivisions";
import { FormatEnum } from "@/src/shared/model/formatLabels";
import { GenderEnum } from "@/src/shared/model/genderLabels";
import { useNavigationInterstitial } from "@/src/modules/advertising/useNavigationInterstitial";

export type SearchTeamScreenProps = {
  search: string;
  debouncedQuery: string;
  setSearch: (text: string) => void;
};

const SEASONS: string[] = ["2026/2027", "2025/2026", "2024/2025"];

const SearchTeamScreen: React.FC<SearchTeamScreenProps> = ({
  search,
  debouncedQuery,
  setSearch,
}) => {
  const { data: divisions } = useDivisions();
  const { handleNavigationWithAd } = useNavigationInterstitial();

  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(
    null,
  );
  const [selectedFormat, setSelectedFormat] = useState<FormatEnum | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderEnum | null>(null);

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

  const { data, isLoading, isError, refetch } = useSearchTeams(
    debouncedQuery,
    selectedSeason ?? undefined,
    selectedDivisionId ?? undefined,
    selectedFormat ?? undefined,
    selectedGender ?? undefined,
  );

  const router = useRouter();

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
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
      setSelectedFormat(opt.value as FormatEnum);
    }
  }, []);

  const handleSelectGender = useCallback((opt: SelectOption) => {
    if (!opt.value) {
      setSelectedGender(null);
    } else {
      setSelectedGender(opt.value as GenderEnum);
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
      placeholder="Rechercher une équipe..."
      exampleLabel="Exemples d’équipes"
      emptyMessage="Aucune équipe trouvée pour cette recherche."
      renderItem={({ item }) => (
        <TeamCard team={item} onPress={() => handleTeamPress(item.id)} />
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
            testIDButton="search-team-season-button"
          />
          <DivisionSelect
            options={divisionOptions}
            selectedValue={selectedDivisionId}
            onSelect={handleSelectDivision}
            testIDButton="search-team-division-button"
          />
          <FormatSelect
            selectedValue={selectedFormat}
            onSelect={handleSelectFormat}
            testIDButton="search-team-format-button"
          />
          <GenderSelect
            selectedValue={selectedGender}
            onSelect={handleSelectGender}
            testIDButton="search-team-gender-button"
          />
        </ScrollView>
      }
      testID="search-team-results"
      inputTestID="search-team-input"
      listTestID="search-team-list"
    />
  );
};

export default SearchTeamScreen;

const styles = StyleSheet.create({
  filters: { marginTop: 6, gap: 8, paddingRight: 8 },
});

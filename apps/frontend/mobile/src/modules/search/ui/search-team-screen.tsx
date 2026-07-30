import React, { useCallback } from "react";
import { useSearchTeams } from "@/src/modules/search/hooks/use-search-teams";
import TeamCard from "@/src/modules/search/ui/team-card";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import SearchResults from "@/src/modules/search/ui/search-results";
import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";
import { useCompetitionSearchFilters } from "@/src/modules/search/hooks/use-competition-search-filters";
import CompetitionSearchFilterStrip from "@/src/modules/search/ui/competition-search-filters";

export type SearchTeamScreenProps = {
  search: string;
  debouncedQuery: string;
  setSearch: (text: string) => void;
};

const SearchTeamScreen: React.FC<SearchTeamScreenProps> = ({
  search,
  debouncedQuery,
  setSearch,
}) => {
  const { handleNavigationWithAd } = useAdvertising();
  const filters = useCompetitionSearchFilters();

  const { data, isLoading, isError, refetch } = useSearchTeams(
    debouncedQuery,
    filters.selectedSeason ?? undefined,
    filters.selectedDivisionId ?? undefined,
    filters.selectedFormat ?? undefined,
    filters.selectedGender ?? undefined,
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
        <CompetitionSearchFilterStrip
          filters={filters}
          testIDPrefix="search-team"
        />
      }
      testID="search-team-results"
      inputTestID="search-team-input"
      listTestID="search-team-list"
    />
  );
};

export default SearchTeamScreen;

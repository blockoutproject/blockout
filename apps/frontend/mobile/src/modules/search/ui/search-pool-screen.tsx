import React, { useCallback } from "react";
import { useSearchPools } from "@/src/modules/search/hooks/use-search-pools";
import PoolCard from "@/src/modules/search/ui/pool-card";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import SearchResults from "@/src/modules/search/ui/search-results";
import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";
import { useCompetitionSearchFilters } from "@/src/modules/search/hooks/use-competition-search-filters";
import CompetitionSearchFilterStrip from "@/src/modules/search/ui/competition-search-filters";

export type SearchPoolScreenProps = {
  search: string;
  debouncedQuery: string;
  setSearch: (text: string) => void;
};

const SearchPoolScreen: React.FC<SearchPoolScreenProps> = ({
  search,
  debouncedQuery,
  setSearch,
}) => {
  const { handleNavigationWithAd } = useAdvertising();
  const filters = useCompetitionSearchFilters();

  const { data, isLoading, isError, refetch } = useSearchPools(
    debouncedQuery,
    filters.selectedSeason ?? undefined,
    filters.selectedDivisionId ?? undefined,
    filters.selectedFormat ?? undefined,
    filters.selectedGender ?? undefined,
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
        <CompetitionSearchFilterStrip
          filters={filters}
          testIDPrefix="search-pool"
        />
      }
      testID="search-pool-results"
      inputTestID="search-pool-input"
      listTestID="search-pool-list"
    />
  );
};

export default SearchPoolScreen;

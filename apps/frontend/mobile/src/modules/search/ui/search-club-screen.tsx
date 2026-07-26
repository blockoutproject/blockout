import React, { useCallback } from "react";
import { useSearchClubs } from "@/src/modules/search/hooks/use-search-clubs";
import ClubCard from "@/src/modules/search/ui/club-card";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import SearchResults from "@/src/modules/search/ui/search-results";
import { useNavigationInterstitial } from "@/src/modules/advertising/use-navigation-interstitial";

export type SearchClubScreenProps = {
  search: string;
  debouncedQuery: string;
  setSearch: (text: string) => void;
};

const SearchClubScreen: React.FC<SearchClubScreenProps> = ({
  search,
  debouncedQuery,
  setSearch,
}) => {
  const { handleNavigationWithAd } = useNavigationInterstitial();
  const { data, isLoading, isError, refetch } = useSearchClubs(
    debouncedQuery,
    search.length === 0,
  );
  const router = useRouter();

  const handleClubPress = useCallback(
    async (clubId: string) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/club/${clubId}`);
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
      placeholder="Rechercher un club..."
      exampleLabel="Exemples de clubs"
      emptyMessage="Aucun club trouvé pour cette recherche."
      renderItem={({ item }) => (
        <ClubCard club={item} onPress={() => handleClubPress(item.id)} />
      )}
      testID="search-club-results"
      inputTestID="search-club-input"
      listTestID="search-club-list"
    />
  );
};

export default SearchClubScreen;

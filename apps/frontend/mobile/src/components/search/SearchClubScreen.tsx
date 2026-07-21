import React, {useCallback} from "react";
import {useSearchClubs} from "@/src/hooks/search/useSearchClubs";
import ClubCard from "@/src/components/search/ClubCard";
import {useRouter} from "expo-router";
import * as Haptics from "expo-haptics";
import {GenericSearchScreen} from "./GenericSearchScreen";
import {useNavigationInterstitial} from "@/src/hooks/ads/useNavigationInterstitial";

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
  const {handleNavigationWithAd} = useNavigationInterstitial();
  const {data, isLoading, isError, refetch} = useSearchClubs(
    debouncedQuery,
    search.length === 0
  );
  const router = useRouter();

  const handleClubPress = useCallback(
    async (clubId: string) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/club/${clubId}`);
      });
    },
    [router, handleNavigationWithAd]
  );

  return (
    <GenericSearchScreen
      search={search}
      debouncedQuery={debouncedQuery}
      setSearch={setSearch}
      data={data}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      placeholder="Rechercher un club..."
      exampleLabel="Exemples de clubs"
      emptyMessage="Aucun club trouvé pour cette recherche."
      renderItem={({item}) => (
        <ClubCard club={item} onPress={() => handleClubPress(item.id)}/>
      )}
    />
  );
};

export default SearchClubScreen;

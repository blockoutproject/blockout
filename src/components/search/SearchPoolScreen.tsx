import React from "react";
import { useSearchPools } from "@/src/hooks/search/useSearchPools";
import PoolCard from "@/src/components/search/PoolCard";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { GenericSearchScreen } from "./GenericSearchScreen";

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
    const { data, isLoading, isError, refetch } = useSearchPools(
        debouncedQuery,
        search.length === 0
    );
    const router = useRouter();

    const handlePress = (id: number) => {
        Haptics.selectionAsync();
        router.push(`/pool/${id}`);
    };

    return (
        <GenericSearchScreen
            search={search}
            debouncedQuery={debouncedQuery}
            setSearch={setSearch}
            data={data}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            placeholder="Rechercher une poule..."
            exampleLabel="Exemples de poules"
            emptyMessage="Aucune poule trouvée pour cette recherche."
            renderItem={({ item }) => (
                <PoolCard pool={item} onPress={() => handlePress(item.id)} />
            )}
        />
    );
};

export default SearchPoolScreen;
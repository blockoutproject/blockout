import React, { useCallback, useMemo, useState } from "react";
import { useSearchPools } from "@/src/hooks/search/useSearchPools";
import PoolCard from "@/src/components/search/PoolCard";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { GenericSearchScreen } from "./GenericSearchScreen";
import { SelectOption } from "@/src/components/common/form/SelectSheet";

export type SearchPoolScreenProps = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
};

// saisons hardcodées côté front (pour l’instant)
const SEASONS: string[] = ["2025/2026", "2024/2025"];

const SearchPoolScreen: React.FC<SearchPoolScreenProps> = ({
    search,
    debouncedQuery,
    setSearch,
}) => {
    const [selectedSeason, setSelectedSeason] = useState<string | null>(
        SEASONS[0],
    );

    const seasonOptions: SelectOption[] = useMemo(
        () => SEASONS.map((s) => ({ value: s, label: s })),
        [],
    );

    const { data, isLoading, isError, refetch } = useSearchPools(
        debouncedQuery,
        selectedSeason ?? undefined,
    );

    const router = useRouter();

    const handlePress = (id: number) => {
        Haptics.selectionAsync();
        router.push(`/pool/${id}`);
    };

    const handleSelectSeason = useCallback((opt: SelectOption) => {
        setSelectedSeason(String(opt.value));
    }, []);

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
            seasonOptions={seasonOptions}
            selectedSeason={selectedSeason}
            onSelectSeason={handleSelectSeason}
            seasonPlaceholderLabel="Saison"
            seasonTestIDButton="search-pool-season-button"
        />
    );
};

export default SearchPoolScreen;
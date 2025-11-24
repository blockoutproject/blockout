import React, { useCallback, useMemo, useState } from "react";
import { useSearchTeams } from "@/src/hooks/search/useSearchTeams";
import TeamCard from "@/src/components/search/TeamCard";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { GenericSearchScreen } from "./GenericSearchScreen";
import { SelectOption } from "@/src/components/common/form/SelectSheet";

export type SearchTeamScreenProps = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
};

const SEASONS: string[] = ["2025/2026", "2024/2025"];

const SearchTeamScreen: React.FC<SearchTeamScreenProps> = ({
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

    const { data, isLoading, isError, refetch } = useSearchTeams(
        debouncedQuery,
        selectedSeason ?? undefined,
    );

    const router = useRouter();

    const handlePress = (id: number) => {
        Haptics.selectionAsync();
        router.push(`/team/${id}`);
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
            placeholder="Rechercher une équipe..."
            exampleLabel="Exemples d’équipes"
            emptyMessage="Aucune équipe trouvée pour cette recherche."
            renderItem={({ item }) => (
                <TeamCard team={item} onPress={() => handlePress(item.id)} />
            )}
            seasonOptions={seasonOptions}
            selectedSeason={selectedSeason}
            onSelectSeason={handleSelectSeason}
            seasonPlaceholderLabel="Saison"
            seasonTestIDButton="search-team-season-button"
        />
    );
};

export default SearchTeamScreen;
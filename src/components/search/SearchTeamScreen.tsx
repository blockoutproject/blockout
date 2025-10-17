import React from "react";
import { useSearchTeams } from "@/src/hooks/search/useSearchTeams";
import TeamCard from "@/src/components/search/TeamCard";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { GenericSearchScreen } from "./GenericSearchScreen";
import { da } from "date-fns/locale";

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
    const { data, isLoading, isError, refetch, error } = useSearchTeams(
        debouncedQuery,
        search.length === 0
    );

    const router = useRouter();

    const handlePress = (id: number) => {
        Haptics.selectionAsync();
        router.push(`/team/${id}`);
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
            placeholder="Rechercher une équipe..."
            exampleLabel="Exemples d’équipes"
            emptyMessage="Aucune équipe trouvée pour cette recherche."
            renderItem={({ item }) => (
                <TeamCard team={item} onPress={() => handlePress(item.id)} />
            )}
        />
    );
};

export default SearchTeamScreen;
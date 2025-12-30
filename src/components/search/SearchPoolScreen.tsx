import React, { useCallback, useMemo, useState } from "react";
import { useSearchPools } from "@/src/hooks/search/useSearchPools";
import PoolCard from "@/src/components/search/PoolCard";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { GenericSearchScreen } from "./GenericSearchScreen";
import { SelectOption } from "@/src/components/common/form/SelectSheet";
import { useDivisions } from "@/src/hooks/config/division/useDivisions";
import { EnumFormat } from "@/src/types/enums/Format";
import { EnumGender } from "@/src/types/enums/Gender";
import { useNavigationInterstitial } from "@/src/hooks/ads/useNavigationInterstitial";

export type SearchPoolScreenProps = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
};

const SEASONS: string[] = ["2025/2026", "2024/2025"];

const SearchPoolScreen: React.FC<SearchPoolScreenProps> = ({
    search,
    debouncedQuery,
    setSearch,
}) => {
    const { handleNavigationWithAd } = useNavigationInterstitial();
    const { data: divisions } = useDivisions();

    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
    const [selectedDivisionId, setSelectedDivisionId] =
        useState<number | null>(null);
    const [selectedFormat, setSelectedFormat] =
        useState<EnumFormat | null>(null);
    const [selectedGender, setSelectedGender] =
        useState<EnumGender | null>(null);

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
        [router, handleNavigationWithAd]
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
                <PoolCard pool={item} onPress={() => handlePoolPress(item.id)} />
            )}
            seasonOptions={seasonOptions}
            selectedSeason={selectedSeason}
            onSelectSeason={handleSelectSeason}
            seasonPlaceholderLabel="Saison"
            seasonTestIDButton="search-pool-season-button"
            divisionOptions={divisionOptions}
            selectedDivisionId={selectedDivisionId}
            onSelectDivision={handleSelectDivision}
            divisionPlaceholderLabel="Division"
            divisionTestIDButton="search-pool-division-button"
            selectedFormat={selectedFormat}
            onSelectFormat={handleSelectFormat}
            formatPlaceholderLabel="Format"
            formatTestIDButton="search-pool-format-button"
            selectedGender={selectedGender}
            onSelectGender={handleSelectGender}
            genderPlaceholderLabel="Genre"
            genderTestIDButton="search-team-gender-button"
        />
    );
};

export default SearchPoolScreen;
// src/components/followed/FollowedScreen.tsx
import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { Filter } from "@/src/types/Filter";
import FollowedTeamsList from "./FollowedTeamsList";
import FollowedPoolsList from "./FollowedPoolsList";
import FollowedListHeader from "./FollowedListHeader";
import SelectSheet, {
    SelectOption,
    SelectSheetRef,
} from "@/src/components/common/form/SelectSheet";

export type FollowedScreenListProps = {
    poolIds?: number[];
    teamIds?: number[];
    headerOffset: number;
};

const FollowedScreen: React.FC<FollowedScreenListProps> = ({
    poolIds,
    teamIds,
    headerOffset,
}) => {
    const theme = useAppTheme();

    const [filters, setFilters] = useState<Filter[]>([
        { name: "Équipes", isActive: true },
        { name: "Poules", isActive: false },
    ]);

    const activeFilter = useMemo(
        () => filters.find((f) => f.isActive)?.name,
        [filters],
    );

    const [teamSeasons, setTeamSeasons] = useState<string[]>([]);
    const [poolSeasons, setPoolSeasons] = useState<string[]>([]);

    const [selectedTeamSeason, setSelectedTeamSeason] = useState<
        string | undefined
    >(undefined);
    const [selectedPoolSeason, setSelectedPoolSeason] = useState<
        string | undefined
    >(undefined);

    const seasonSheetRef = useRef<SelectSheetRef>(null);

    const seasonLabel = useMemo(() => {
        const current =
            activeFilter === "Équipes"
                ? selectedTeamSeason
                : selectedPoolSeason;
        return current ?? "Saison";
    }, [activeFilter, selectedTeamSeason, selectedPoolSeason]);

    const currentSeasonOptions: SelectOption[] = useMemo(() => {
        const seasons =
            activeFilter === "Équipes" ? teamSeasons : poolSeasons;
        return seasons.map((s) => ({ value: s, label: s }));
    }, [activeFilter, teamSeasons, poolSeasons]);

    const currentSelectedSeason = useMemo(
        () =>
            activeFilter === "Équipes"
                ? selectedTeamSeason ?? ""
                : selectedPoolSeason ?? "",
        [activeFilter, selectedTeamSeason, selectedPoolSeason],
    );

    const handlePressSeason = useCallback(async () => {
        if (currentSeasonOptions.length === 0) return;
        await Haptics.selectionAsync();
        seasonSheetRef.current?.present();
    }, [currentSeasonOptions.length]);

    const handleSelectSeason = useCallback(
        (opt: SelectOption) => {
            if (typeof opt.value !== "string" || !opt.value) return;
            if (activeFilter === "Équipes") {
                setSelectedTeamSeason(opt.value);
            } else {
                setSelectedPoolSeason(opt.value);
            }
        },
        [activeFilter],
    );

    const handleTeamSeasonsChange = useCallback((seasons: string[]) => {
        setTeamSeasons(seasons);
        setSelectedTeamSeason((prev) =>
            prev && seasons.includes(prev) ? prev : seasons[0],
        );
    }, []);

    const handlePoolSeasonsChange = useCallback((seasons: string[]) => {
        setPoolSeasons(seasons);
        setSelectedPoolSeason((prev) =>
            prev && seasons.includes(prev) ? prev : seasons[0],
        );
    }, []);

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.background },
            ]}
        >
            <FollowedListHeader
                filters={filters}
                setFilters={setFilters}
                headerOffset={headerOffset}
                seasonLabel={
                    currentSeasonOptions.length > 0
                        ? seasonLabel
                        : "Saison"
                }
                onPressSeason={handlePressSeason}
            />

            {activeFilter === "Équipes" ? (
                <FollowedTeamsList
                    teamIds={teamIds}
                    selectedSeason={selectedTeamSeason}
                    onSeasonsChange={handleTeamSeasonsChange}
                />
            ) : (
                <FollowedPoolsList
                    poolIds={poolIds}
                    selectedSeason={selectedPoolSeason}
                    onSeasonsChange={handlePoolSeasonsChange}
                />
            )}

            <SelectSheet
                ref={seasonSheetRef}
                title="Choisir une saison"
                options={currentSeasonOptions}
                selectedValue={currentSelectedSeason}
                onSelect={handleSelectSeason}
                clearable={false}
            />
        </View>
    );
};

export default FollowedScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});
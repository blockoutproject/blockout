import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/src/shared/theme";
import { Filter } from "@/src/shared/model/Filter";
import FollowedTeamsList from "@/src/modules/followed/ui/followed-teams-list";
import FollowedPoolsList from "@/src/modules/followed/ui/followed-pools-list";
import FollowedListHeader from "@/src/modules/followed/ui/followed-list-header";
import { SelectOption } from "@/src/shared/ui/form/SelectSheet";
import SeasonSelect from "@/src/shared/ui/form/SeasonSelect";

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

  const currentSeasonOptions: SelectOption[] = useMemo(() => {
    const seasons = activeFilter === "Équipes" ? teamSeasons : poolSeasons;
    return seasons.map((s) => ({ value: s, label: s }));
  }, [activeFilter, teamSeasons, poolSeasons]);

  const currentSelectedSeason = useMemo(
    () =>
      activeFilter === "Équipes"
        ? (selectedTeamSeason ?? "")
        : (selectedPoolSeason ?? ""),
    [activeFilter, selectedTeamSeason, selectedPoolSeason],
  );

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
      style={[styles.container, { backgroundColor: theme.background }]}
      testID="followed-screen"
    >
      <FollowedListHeader
        filters={filters}
        setFilters={setFilters}
        headerOffset={headerOffset}
        seasonNode={
          <SeasonSelect
            options={currentSeasonOptions}
            selectedValue={currentSelectedSeason}
            onSelect={handleSelectSeason}
            testIDButton="followed-season-button"
          />
        }
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
    </View>
  );
};

export default FollowedScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
});

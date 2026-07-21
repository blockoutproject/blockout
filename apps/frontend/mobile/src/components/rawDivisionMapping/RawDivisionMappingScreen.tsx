import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ActivityIndicator, Keyboard, RefreshControl, StyleSheet, Text, View} from "react-native";
import {FlatList} from "react-native-gesture-handler";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useRawDivisionMappings} from "@/src/hooks/config/rawDivisionMapping/useRawDivisionMapping";
import {RawDivisionMapping} from "@/src/types/RawDivisionMapping";
import {Filter} from "@/src/types/Filter";
import Filters from "@/src/shared/ui/Filters";
import RawDivisionMappingItem from "@/src/components/rawDivisionMapping/RawDivisionMappingItem";
import {BottomSheetModal} from "@gorhom/bottom-sheet";
import SearchBar from "@/src/shared/ui/SearchBar";
import RawDivisionMappingFormSheet from "@/src/components/rawDivisionMapping/RawDivisionMappingFormSheet";

type FilterName = string;

const mergeFilters = (nextNames: FilterName[], prev: Filter[]): Filter[] => {
  const prevState = new Map(prev.map((f) => [f.name, f.isActive]));
  return nextNames.map((name) => ({name, isActive: prevState.get(name) ?? false}));
};

const RawDivisionMappingScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const {data, isLoading, refetch} = useRawDivisionMappings();

  const formSheetRef = useRef<BottomSheetModal>(null);
  const [editing, setEditing] = useState<RawDivisionMapping | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [mappingFilters, setMappingFilters] = useState<Filter[]>([
    {name: "Mappés", isActive: false},
    {name: "Non mappés", isActive: false},
  ]);

  const leagueNames = useMemo(() => Array.from(new Set(data?.map((d) => d.leagueCode))).sort(), [data]);
  const seasonNames = useMemo<string[]>(
    () => Array.from(new Set((data ?? []).map((d) => String(d.season)))).sort((a, b) => b.localeCompare(a, undefined, {numeric: true})),
    [data]
  );

  const [leagueFilters, setLeagueFilters] = useState<Filter[]>(leagueNames.map((name) => ({name, isActive: false})));
  const [seasonFilters, setSeasonFilters] = useState<Filter[]>(seasonNames.map((s) => ({
    name: s.toString(),
    isActive: false
  })));

  useEffect(() => setLeagueFilters((prev) => mergeFilters(leagueNames, prev)), [leagueNames]);
  useEffect(() => setSeasonFilters((prev) => mergeFilters(seasonNames.map((s) => s.toString()), prev)), [seasonNames]);

  const openForm = (mapping: RawDivisionMapping) => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    setEditing(mapping);
    formSheetRef.current?.present();
  };
  const closeForm = () => formSheetRef.current?.dismiss();

  const activeMapping = mappingFilters.find((f) => f.isActive)?.name ?? "";
  const activeLeagues = leagueFilters.filter((f) => f.isActive).map((f) => f.name);
  const activeSeasons = seasonFilters.filter((f) => f.isActive).map((f) => f.name);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => {
      const txt = item.rawDivisionName.toLowerCase();
      const matchesSearch = txt.includes(search.toLowerCase());
      const isMapped = Boolean(item.divisionId && item.format && item.gender);
      const matchesMapping =
        activeMapping === "" || (activeMapping === "Mappés" && isMapped) || (activeMapping === "Non mappés" && !isMapped);
      const matchesLeague = activeLeagues.length === 0 || activeLeagues.includes(item.leagueCode);
      const matchesSeason = activeSeasons.length === 0 || activeSeasons.includes(item.season.toString());
      return matchesSearch && matchesMapping && matchesLeague && matchesSeason;
    });
  }, [data, search, activeMapping, activeLeagues, activeSeasons]);

  const sortedData = useMemo(() => [...filteredData].sort((a, b) => a.id - b.id), [filteredData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  if (isLoading || !data) {
    return (
      <View style={[styles.center, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.text}/>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher par nom brut..."/>

        <View style={styles.filterWrapper}>
          <Filters filters={mappingFilters} setFilters={setMappingFilters} singleSelect/>
          <Filters filters={leagueFilters} setFilters={setLeagueFilters}/>
          <Filters filters={seasonFilters} setFilters={setSeasonFilters}/>
        </View>

        <FlatList
          style={styles.flatList}
          data={sortedData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({item}) => <RawDivisionMappingItem mapping={item} onPress={() => openForm(item)}/>}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.text}/>}
          contentContainerStyle={{paddingBottom: insets.bottom + 16}}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{color: theme.textInactive}}>Aucun résultat correspondant.</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {!!editing && (
        <RawDivisionMappingFormSheet
          ref={formSheetRef}
          mapping={editing}
          onSuccess={() => {
            refetch();
            closeForm();
          }}
          snapPoint="90%"
          footerLabel="Enregistrer"
        />
      )}
    </>
  );
};

export default RawDivisionMappingScreen;

const styles = StyleSheet.create({
  container: {flex: 1, gap: 16},
  center: {flex: 1, justifyContent: "center", alignItems: "center"},
  filterWrapper: {flexDirection: "column", gap: 6},
  flatList: {paddingHorizontal: 8},
  emptyState: {alignItems: "center", marginTop: 32},
});

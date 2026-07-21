import React, {useCallback, useMemo, useRef, useState} from "react";
import {ActivityIndicator, Keyboard, RefreshControl, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useDivisions} from "@/src/modules/division/hooks/useDivisions";
import {DivisionResponse} from "@/src/modules/division/model/Division";
import {Filter} from "@/src/shared/model/Filter";
import {BottomSheetModal} from "@gorhom/bottom-sheet";
import DivisionItem from "@/src/modules/division/ui/DivisionItem";
import SearchBar from "@/src/shared/ui/SearchBar";
import Filters from "@/src/shared/ui/Filters";
import DivisionFormSheet from "@/src/modules/division/ui/DivisionFormSheet";
import {FlashList} from "@shopify/flash-list";

const DivisionScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const {data, isLoading, refetch: refetchDivisions} = useDivisions();

  const formSheetRef = useRef<BottomSheetModal>(null);
  const [editedDivision, setEditedDivision] = useState<DivisionResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<Filter[]>([
    {name: "Actives", isActive: false},
    {name: "Inactives", isActive: false},
  ]);

  const openForm = (division: DivisionResponse | null) => {
    Haptics.selectionAsync();
    setEditedDivision(division);
    formSheetRef.current?.present();
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await refetchDivisions();
    setIsRefreshing(false);
  }, [refetchDivisions]);

  const closeForm = () => formSheetRef.current?.dismiss();

  const activeStatus = statusFilters.find((f) => f.isActive)?.name ?? "";

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((d) => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = activeStatus === "" || (activeStatus === "Actives" && d.active) || (activeStatus === "Inactives" && !d.active);
      return matchSearch && matchStatus;
    });
  }, [data, search, activeStatus]);

  const sorted = useMemo(() => [...filteredData].sort((a, b) => a.id - b.id), [filteredData]);

  if (isLoading || !data) {
    return (
      <View style={[styles.center, {backgroundColor: theme.background}]} testID="division-loading">
        <ActivityIndicator size="large" color={theme.text}/>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, {backgroundColor: theme.background}]} testID="division-screen">
        <View style={styles.searchRow}>
          <View style={{flex: 1}}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une division..."/>
          </View>
          <TouchableOpacity onPress={() => openForm(null)} style={[styles.addButton, {backgroundColor: theme.primary}]}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Ajouter une division"
                            testID="division-add-action">
            <Text style={styles.addButtonText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        <Filters filters={statusFilters} setFilters={setStatusFilters} singleSelect/>

        <FlashList
          style={styles.flatList}
          data={sorted}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({item}) => (
            <DivisionItem division={item} onPress={() => openForm(item)} onDeactivated={refetchDivisions}/>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.text}
            />}
          contentContainerStyle={{paddingBottom: insets.bottom + 16}}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{color: theme.textInactive}}>Aucun résultat trouvé.</Text>
            </View>
          }
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
          testID="division-list"
        />
      </View>

      <DivisionFormSheet
        ref={formSheetRef}
        division={editedDivision}
        onSuccess={() => {
          refetchDivisions();
          closeForm();
        }}
        snapPoint="90%"
      />
    </>
  );
};

export default DivisionScreen;

const styles = StyleSheet.create({
  container: {flex: 1, gap: 16},
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginTop: 16,
    gap: 12
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18
  },
  addButtonText: {color: "white", fontWeight: "bold"},
  filtersWrapper: {paddingHorizontal: 8},
  flatList: {paddingHorizontal: 8},
  emptyState: {alignItems: "center", marginTop: 32},
});

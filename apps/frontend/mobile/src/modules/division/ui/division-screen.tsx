import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, spacing, useAppTheme } from "@/src/shared/theme";
import { useDivisions } from "@/src/modules/division/hooks/use-divisions";
import { DivisionResponse } from "@/src/shared/generated/models";
import { Filter } from "@/src/shared/view-models/filter";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { SearchField } from "@/src/shared/ui/search-field";
import Filters from "@/src/shared/ui/filters";
import DivisionFormSheet from "@/src/modules/division/ui/division-form-sheet";
import { Pill } from "@/src/shared/ui/pill";
import DivisionList from "@/src/modules/division/ui/division-list";
import {
  type DivisionStatusFilter,
  toDivisionListPresentation,
} from "@/src/modules/division/view-models/division-list-presentation";

const DivisionScreen: React.FC = () => {
  const theme = useAppTheme();
  const { data, isLoading, refetch: refetchDivisions } = useDivisions();

  const formSheetRef = useRef<BottomSheetModal>(null);
  const [editedDivision, setEditedDivision] = useState<DivisionResponse | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<Filter[]>([
    { name: "Actives", isActive: false },
    { name: "Inactives", isActive: false },
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

  const activeStatus = (statusFilters.find((filter) => filter.isActive)?.name ??
    "") as DivisionStatusFilter;
  const divisions = useMemo(
    () => toDivisionListPresentation(data ?? [], search, activeStatus),
    [activeStatus, data, search],
  );

  if (isLoading || !data) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.background }]}
        testID="division-loading"
      >
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <>
      <View
        style={[styles.container, { backgroundColor: theme.background }]}
        testID="division-screen"
      >
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher une division..."
            />
          </View>
          <Pill
            onPress={() => openForm(null)}
            accessibilityLabel="Ajouter une division"
            label="Ajouter"
            size="lg"
            borderWidth={0}
            backgroundColor={theme.primary}
            textColor={colors.text.primary}
            testID="division-add-action"
          />
        </View>

        <Filters
          filters={statusFilters}
          setFilters={setStatusFilters}
          singleSelect
        />

        <DivisionList
          divisions={divisions}
          isRefreshing={isRefreshing}
          onEdit={openForm}
          onRefresh={handleRefresh}
          onDeactivated={refetchDivisions}
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
  container: { flex: 1, gap: spacing[4] },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing[2],
    marginTop: spacing[4],
    gap: spacing[3],
  },
});

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { iconSize, layout, spacing, useAppTheme } from "@/src/shared/theme";

import Filters from "@/src/shared/ui/filters";
import { Filter } from "@/src/shared/model/filter";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Header for search screen with filters and report button. */
export type SearchHeaderProps = {
  /** Active filters array. */
  filters: Filter[];
  /** Filters setter. */
  setFilters: (updated: Filter[]) => void;
  /** Opens report modal. */
  onOpenReport: () => void;
};

const SearchHeader: React.FC<SearchHeaderProps> = ({
  filters,
  setFilters,
  onOpenReport,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
        },
      ]}
      testID="search-header"
    >
      <View style={styles.header}>
        <Filters
          filters={filters}
          setFilters={setFilters}
          singleSelect
          requireSelection
          scrollable={false}
          style={styles.filters}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Signaler un problème"
          onPress={onOpenReport}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          testID="search-report-action"
        >
          <MaterialCommunityIcons
            name="flag-outline"
            size={iconSize.navigation}
            color={theme.text}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default SearchHeader;

const styles = StyleSheet.create({
  header: {
    height: layout.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3],
  },
  filters: { paddingHorizontal: 0 },
  pressed: { opacity: 0.7 },
});

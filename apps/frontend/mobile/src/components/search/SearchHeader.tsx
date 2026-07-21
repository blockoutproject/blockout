import React from "react";
import {StyleSheet, View} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";

import {useAppTheme} from "@/src/context/ThemeProvider";
import {HEADER_HEIGHT} from "@/src/theme/globals";
import Filters from "@/src/components/common/Filters";
import {Filter} from "@/src/types/Filter";
import {useSafeAreaInsets} from "react-native-safe-area-context";

/** Header for search screen with filters and report button. */
export type SearchHeaderProps = {
  /** Active filters array. */
  filters: Filter[];
  /** Filters setter. */
  setFilters: (updated: Filter[]) => void;
  /** Opens report modal. */
  onOpenReport: () => void;
};

const SearchHeader: React.FC<SearchHeaderProps> = ({filters, setFilters, onOpenReport}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View
        style={styles.header}
      >
        <Filters
          filters={filters}
          setFilters={setFilters}
          singleSelect
          requireSelection
          scrollable={false}
          style={{paddingHorizontal: 0}}
        />

        <View
          style={styles.actions}
        >
          <MaterialCommunityIcons
            name="flag-outline"
            size={28}
            color={theme.text}
            onPress={onOpenReport}
          />
        </View>
      </View>
    </View>
  );
};

export default SearchHeader;

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  actions: {},
});

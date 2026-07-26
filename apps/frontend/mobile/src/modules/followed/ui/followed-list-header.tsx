import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import Filters from "@/src/shared/ui/filters";
import { Filter } from "@/src/shared/model/filter";
import { spacing, useAppTheme } from "@/src/shared/theme";

type Props = {
  filters: Filter[];
  setFilters: (next: Filter[] | ((prev: Filter[]) => Filter[])) => void;
  headerOffset: number;
  seasonNode: React.ReactNode;
};

const FollowedListHeader: React.FC<Props> = ({
  filters,
  setFilters,
  headerOffset,
  seasonNode,
}) => {
  const theme = useAppTheme();

  const Spacer = useMemo(
    () => (
      <View
        style={{
          height: headerOffset,
          backgroundColor: theme.background,
        }}
      />
    ),
    [headerOffset, theme.background],
  );

  return (
    <View testID="followed-header">
      {Spacer}

      <View style={styles.row}>
        <Filters
          filters={filters}
          setFilters={setFilters}
          singleSelect
          requireSelection
          scrollable={false}
          style={{
            backgroundColor: "transparent",
          }}
        />

        {seasonNode}
      </View>
    </View>
  );
};

export default FollowedListHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[2],
    paddingRight: spacing[2],
  },
});

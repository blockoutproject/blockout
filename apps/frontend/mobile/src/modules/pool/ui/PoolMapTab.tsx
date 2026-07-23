import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {layout, useAppTheme} from "@/src/shared/theme";
import type { PoolResponse } from "@/src/shared/generated/models";

import PoolMapCard from "./PoolMapCard";

type Props = {
  enrichedPool: PoolResponse;
};

const PoolMapTab: React.FC<Props> = ({ enrichedPool }) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          marginTop: layout.tabs + 8,
          paddingBottom:
            insets.bottom + layout.bottomNavigation + layout.sectionSeparator + 4,
          backgroundColor: theme.background,
        },
      ]}
    >
      <PoolMapCard enrichedPool={enrichedPool} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 4,
  },
});

export default PoolMapTab;

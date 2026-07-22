import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import type { PoolResponse } from "@/src/shared/generated/models";
import {
  BOTTOM_TABBAR_HEIGHT,
  SECTION_SEPARATOR_HEIGHT,
  TABBAR_HEIGHT,
} from "@/src/shared/theme/tokens";
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
          marginTop: TABBAR_HEIGHT + 8,
          paddingBottom:
            insets.bottom + BOTTOM_TABBAR_HEIGHT + SECTION_SEPARATOR_HEIGHT + 4,
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

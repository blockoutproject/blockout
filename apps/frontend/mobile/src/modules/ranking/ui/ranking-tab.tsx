import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RankingCard from "./ranking-card";
import { layout, spacing, useAppTheme } from "@/src/shared/theme";
import type { PoolResponse } from "@/src/shared/generated/models";

import type { TeamHighlight } from "@/src/modules/team/model/TeamHighlight";
import FadeIn from "@/src/shared/ui/animations/FadeIn";

type Props = {
  pool: PoolResponse;
  highlightTeams?: TeamHighlight[];
};

const RankingTab: React.FC<Props> = ({ pool, highlightTeams }) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          marginTop: layout.tabs + 8,
          paddingBottom:
            insets.bottom +
            layout.bottomNavigation +
            layout.sectionSeparator +
            spacing[1],
          backgroundColor: theme.background,
        },
      ]}
      testID={`ranking-screen-${pool.id}`}
    >
      <FadeIn>
        <RankingCard pool={pool} highlightTeams={highlightTeams} />
      </FadeIn>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[1],
  },
});

export default RankingTab;

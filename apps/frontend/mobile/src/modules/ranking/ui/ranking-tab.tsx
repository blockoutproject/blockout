import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RankingCard from "./ranking-card";
import { layout, spacing, useAppTheme } from "@/src/shared/theme";
import type { PoolResponse } from "@/src/shared/generated/models";

import type { TeamHighlight } from "@/src/modules/team/model/team-highlight";
import FadeIn from "@/src/shared/ui/animations/fade-in";

type Props = {
  pool: PoolResponse;
  highlightTeams?: TeamHighlight[];
};

const RankingTab: React.FC<Props> = ({ pool, highlightTeams }) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <ScrollView
      style={[
        styles.container,
        {
          marginTop: layout.tabs + 8,
          backgroundColor: theme.background,
        },
      ]}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom:
            insets.bottom +
            layout.bottomNavigation +
            layout.sectionSeparator +
            spacing[1],
        },
      ]}
      showsVerticalScrollIndicator={false}
      testID={`ranking-screen-${pool.id}`}
    >
      <FadeIn>
        <RankingCard pool={pool} highlightTeams={highlightTeams} />
      </FadeIn>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[1],
  },
});

export default RankingTab;

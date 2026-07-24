import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { borderWidth, radius, spacing, useAppTheme } from "@/src/shared/theme";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import type {
  PoolResponse,
  TeamWithStatsResponse,
} from "@/src/shared/generated/models";
import type { TeamHighlight } from "@/src/modules/team/model/team-highlight";
import RankingRow from "./ranking-row";
import RankingHeader from "./ranking-header";
import { useRouter } from "expo-router";
import { useNavigationInterstitial } from "@/src/modules/advertising/use-navigation-interstitial";

type RankingCardProps = {
  pool: PoolResponse;
  highlightTeams?: TeamHighlight[];
};

const RankingCard: React.FC<RankingCardProps> = ({ pool, highlightTeams }) => {
  const theme = useAppTheme();
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();

  const { division } = pool;
  const gradient = useMemo(
    () =>
      [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
      ] as const,
    [
      division.firstGradientColor,
      division.secondGradientColor,
      division.thirdGradientColor,
    ],
  );

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

  const handleHeaderPress = useCallback(async () => {
    await Haptics.selectionAsync();

    handleNavigationWithAd(() => {
      router.push(`/pool/${pool.id}`);
    });
  }, [router, handleNavigationWithAd, pool.id]);

  const renderItem = useCallback(
    (item: TeamWithStatsResponse, index: number) => (
      <RankingRow
        key={item.id}
        item={item}
        index={index}
        theme={theme}
        highlightTeams={highlightTeams}
        gradient={gradient}
        onPress={handleTeamPress}
      />
    ),
    [gradient, handleTeamPress, highlightTeams, theme],
  );

  return (
    <GradientBorderView
      gradient={gradient}
      borderRadius={radius.lg}
      borderWidth={borderWidth.thin}
      style={[styles.card, { backgroundColor: theme.background }]}
    >
      <View style={styles.innerClip}>
        <RankingHeader pool={pool} onPress={handleHeaderPress} />
        <View style={styles.listContent} testID={`ranking-list-${pool.id}`}>
          {pool.ranking.map(renderItem)}
        </View>
      </View>
    </GradientBorderView>
  );
};

export default RankingCard;

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg },
  innerClip: {
    borderRadius: radius.lg - borderWidth.thin,
    overflow: "hidden",
  },
  listContent: {
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
});

import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { borderWidth, radius, spacing, useAppTheme } from "@/src/shared/theme";
import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import type {
  PoolResponse,
  TeamWithStatsResponse,
} from "@/src/shared/generated/models";
import type { TeamHighlight } from "@/src/modules/team/model/TeamHighlight";
import RankingRow from "./ranking-row";
import RankingHeader from "./ranking-header";
import { useRouter } from "expo-router";
import { useNavigationInterstitial } from "@/src/modules/advertising/useNavigationInterstitial";

type RankingCardProps = {
  pool: PoolResponse;
  scrollable?: boolean;
  highlightTeams?: TeamHighlight[];
};

const RankingCard: React.FC<RankingCardProps> = ({
  pool,
  scrollable = true,
  highlightTeams,
}) => {
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
    ({ item, index }: ListRenderItemInfo<TeamWithStatsResponse>) => (
      <RankingRow
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
        <FlashList
          data={pool.ranking}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={
            <RankingHeader pool={pool} onPress={handleHeaderPress} />
          }
          stickyHeaderIndices={[0]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollable}
          contentContainerStyle={styles.listContent}
          testID={`ranking-list-${pool.id}`}
        />
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
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
});

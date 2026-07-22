import React, {useCallback} from "react";
import {StyleSheet, View} from "react-native";
import {FlatList} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import type {PoolResponse} from "@/src/shared/generated/models";
import type {TeamHighlight} from "@/src/modules/team/model/TeamHighlight";
import RankingRow from "./RankingRow";
import RankingHeader from "./RankingHeader";
import {useRouter} from "expo-router";
import {useNavigationInterstitial} from "@/src/modules/advertising/useNavigationInterstitial";

type RankingCardProps = {
  pool: PoolResponse;
  scrollable?: boolean;
  highlightTeams?: TeamHighlight[];
};

const RADIUS = 18;

const RankingCard: React.FC<RankingCardProps> = ({
                                                   pool,
                                                   scrollable = true,
                                                   highlightTeams,
                                                 }) => {
  const theme = useAppTheme();
  const router = useRouter();
  const {handleNavigationWithAd} = useNavigationInterstitial();

  const {division} = pool;
  const gradient = [
    division.firstGradientColor,
    division.secondGradientColor,
    division.thirdGradientColor,
  ] as const;

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [router, handleNavigationWithAd]
  );

  const handleHeaderPress = useCallback(
    async () => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/pool/${pool.id}`);
      });
    },
    [router, handleNavigationWithAd, pool.id]
  );

  return (
    <GradientBorderView
      gradient={gradient}
      borderRadius={RADIUS}
      borderWidth={1}
      style={[styles.card, {backgroundColor: theme.background}]}
    >
      <View style={styles.innerClip}>
        <FlatList
          data={pool.ranking}
          keyExtractor={(item) => String(item.id)}
          renderItem={({item, index}) => (
            <RankingRow
              item={item}
              index={index}
              theme={theme}
              highlightTeams={highlightTeams}
              gradient={gradient}
              onPress={handleTeamPress}
            />
          )}
          ListHeaderComponent={
            <RankingHeader
              pool={pool}
              onPress={handleHeaderPress}
            />
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
  card: {borderRadius: RADIUS},
  innerClip: {borderRadius: RADIUS - 1, overflow: "hidden"},
  listContent: {paddingBottom: 8, gap: 10},
});

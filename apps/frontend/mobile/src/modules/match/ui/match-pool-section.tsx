import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import type {
  DivisionResponse,
  MatchResponse,
  PoolMatchesResponse,
} from "@/src/shared/generated/models";
import {
  borderWidth,
  layout,
  radius,
  spacing,
  useAppTheme,
} from "@/src/shared/theme";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import FadeIn from "@/src/shared/ui/animations/fade-in";
import RankingHeader from "@/src/modules/ranking/ui/ranking-header";
import MatchRow from "@/src/modules/match/ui/match-row";
import { useNavigationInterstitial } from "@/src/modules/advertising/hooks/use-navigation-interstitial";

/** Carte listant les matchs d’une poule. */
export type MatchPoolSectionProps = {
  /** Pool and matches displayed in this section. */
  poolMatches: PoolMatchesResponse;
  /** Callback ouverture d’un match. */
  handleMatchPress: (id: number) => void;
  /** Affiche l’en-tête cliquable de la poule. */
  showHeader?: boolean;
};

type MatchPoolItemProps = {
  division: DivisionResponse;
  match: MatchResponse;
  onPress: (id: number) => void;
};

const MatchPoolItem = React.memo(function MatchPoolItem({
  division,
  match,
  onPress,
}: MatchPoolItemProps) {
  const handlePress = useCallback(() => {
    onPress(match.id);
  }, [match.id, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le match ${match.teamA.shortName} contre ${match.teamB.shortName}`}
      onPress={handlePress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      testID={`match-item-${match.id}`}
    >
      <MatchRow match={match} division={division} />
    </Pressable>
  );
});

const MatchPoolSection: React.FC<MatchPoolSectionProps> = ({
  poolMatches,
  handleMatchPress,
  showHeader = true,
}) => {
  const theme = useAppTheme();
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();
  const division = poolMatches.pool.division;

  const gradient = [
    division.firstGradientColor,
    division.secondGradientColor,
    division.thirdGradientColor,
  ] as const;

  const handleHeaderPress = useCallback(async () => {
    await Haptics.selectionAsync();

    handleNavigationWithAd(() => {
      router.push(`/pool/${poolMatches.pool.id}`);
    });
  }, [handleNavigationWithAd, poolMatches.pool.id, router]);

  return (
    <FadeIn>
      <View style={styles.wrapper} testID={`match-pool-${poolMatches.pool.id}`}>
        <GradientBorderView
          gradient={gradient}
          borderRadius={radius.lg}
          borderWidth={borderWidth.thin}
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
            },
          ]}
        >
          <View style={styles.innerClip}>
            {showHeader ? (
              <RankingHeader
                pool={poolMatches.pool}
                onPress={handleHeaderPress}
              />
            ) : null}

            <View style={styles.matchList}>
              {poolMatches.matches.map((match) => (
                <MatchPoolItem
                  key={match.id}
                  match={match}
                  division={division}
                  onPress={handleMatchPress}
                />
              ))}
            </View>
          </View>
        </GradientBorderView>
      </View>
    </FadeIn>
  );
};

export default React.memo(MatchPoolSection);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: layout.sectionSeparator,
  },
  card: {
    borderRadius: radius.lg,
  },
  innerClip: {
    borderRadius: radius.lg - borderWidth.thin,
    overflow: "hidden",
  },
  matchList: {
    padding: spacing[2],
    gap: spacing[2],
    backgroundColor: "transparent",
  },
  pressed: { opacity: 0.85 },
});

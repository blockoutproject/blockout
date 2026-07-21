import React, {useCallback} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import * as Haptics from "expo-haptics";

import {PoolMatchesResponse} from "@/src/modules/match/model/Match";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import MatchRow from "./MatchRow";
import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import FadeIn from "@/src/shared/ui/animations/FadeIn";
import {SECTION_SEPARATOR_HEIGHT} from "@/src/shared/theme/tokens";
import RankingHeader from "@/src/modules/ranking/ui/RankingHeader";
import {useRouter} from "expo-router";
import {useNavigationInterstitial} from "@/src/hooks/ads/useNavigationInterstitial";

/** Carte listant les matchs d’une poule. */
export type MatchPoolSectionProps = {
  /** Pool and matches displayed in this section. */
  poolMatches: PoolMatchesResponse;
  /** Callback ouverture d’un match. */
  handleMatchPress: (id: number) => void;
  /** Affiche l’en-tête cliquable de la poule. */
  showHeader?: boolean;
};

const RADIUS = 16;

const MatchPoolSection: React.FC<MatchPoolSectionProps> = ({
                                             poolMatches,
                                             handleMatchPress,
                                             showHeader = true,
                                           }) => {
  const theme = useAppTheme();
  const router = useRouter();
  const {handleNavigationWithAd} = useNavigationInterstitial();
  const division = poolMatches.pool.division;

  const gradient = [
    division.firstGradientColor,
    division.secondGradientColor,
    division.thirdGradientColor,
  ] as const;

  const handleHeaderPress = useCallback(
    async (poolId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/pool/${poolId}`);
      });
    },
    [router, handleNavigationWithAd]
  );

  return (
    <FadeIn>
      <View style={styles.wrapper} testID={`match-pool-${poolMatches.pool.id}`}>
        <GradientBorderView
          gradient={gradient}
          borderRadius={RADIUS}
          borderWidth={1}
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
            },
          ]}
        >
          <View
            style={styles.innerClip}
          >
            {showHeader ? (
              <RankingHeader pool={poolMatches.pool}
                             onPress={() => handleHeaderPress(poolMatches.pool.id)}/>
            ) : null}

            <View
              style={styles.matchList}
            >
              {poolMatches.matches.map((match) => (
                <Pressable
                  key={match.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir le match ${match.teamA.shortName} contre ${match.teamB.shortName}`}
                  onPress={() => handleMatchPress(match.id)}
                  style={({pressed}) => pressed ? styles.pressed : undefined}
                  testID={`match-item-${match.id}`}
                >
                  <MatchRow
                    match={match}
                    division={division}
                  />
                </Pressable>
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
    marginBottom: SECTION_SEPARATOR_HEIGHT,
  },
  card: {
    borderRadius: RADIUS,
  },
  innerClip: {
    borderRadius: RADIUS - 1,
    overflow: "hidden",
  },
  headerRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  poolTitle: {
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1
  },
  divisionTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  matchList: {
    padding: 8,
    gap: 8,
    backgroundColor: "transparent",
  },
  pressed: {opacity: 0.85},
});

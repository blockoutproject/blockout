import React, {useCallback} from "react";
import {Image, Pressable, StyleSheet, Text, View} from "react-native";
import {EnrichedMatchDTO} from "@/src/types/Match";
import {Team} from "@/src/types/Team";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import {useRouter} from "expo-router";
import * as Haptics from "expo-haptics";
import {useNavigationInterstitial} from "@/src/hooks/ads/useNavigationInterstitial";

/** Per-set score breakdown. */
export type MatchScoreDetailsCardProps = {
  /** Enriched match payload. */
  enrichedMatch: EnrichedMatchDTO;
};

const RADIUS = 18;
const LOGO = 30;
const SET_COL_W = 32;

const MatchScoreDetailsCard: React.FC<MatchScoreDetailsCardProps> = ({
                                                                       enrichedMatch,
                                                                     }) => {
  const theme = useAppTheme();
  const router = useRouter();
  const {handleNavigationWithAd} = useNavigationInterstitial();

  const gradient = [
    enrichedMatch.pool.division.firstGradientColor,
    enrichedMatch.pool.division.secondGradientColor,
    enrichedMatch.pool.division.thirdGradientColor,
  ] as const;

  const setsArray = enrichedMatch.score
    ? enrichedMatch.score.split(",").map((s) => s.split("-").map((n) => parseInt(n, 10)))
    : [];
  const [homeFinal = "0", awayFinal = "0"] = (enrichedMatch.set || "0-0").split("-");
  const maxSets = Math.max(setsArray.length, 0);

  const homeSets = setsArray.map(([h]) => h);
  const awaySets = setsArray.map(([, a]) => a);

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [router, handleNavigationWithAd]
  );

  const HeaderRow: React.FC = () => (
    <View
      style={styles.row}
    >
      <Text
        style={[
          styles.headerScoreText,
          {
            color: theme.text,
          },
        ]}
      >
        Score
      </Text>
      <View
        style={styles.identityBlock}
      />
      {Array.from({length: maxSets}).map((_, i) => (
        <View
          key={`h-${i}`}
          style={styles.setColumn}
        >
          <Text
            style={[
              styles.setHeaderText,
              {
                color: theme.textInactive,
              },
            ]}
          >
            {`S${i + 1}`}
          </Text>
        </View>
      ))}
    </View>
  );

  const TeamRow: React.FC<{
    /** Team entity with logo url. */
    team: Team & { logoUrl: string | null };
    /** Final set count for team. */
    finalScore: string;
    /** Points per set. */
    sets: number[];
    /** Opponent points per set. */
    opponentSets: number[];
  }> = ({team, finalScore, sets, opponentSets}) => (
    <Pressable
      style={[
        styles.row
      ]}
      onPress={() => handleTeamPress(team.id)}
    >
      <View
        style={styles.identityBlock}
      >
        <Image
          source={
            team.logoUrl
              ? {uri: team.logoUrl}
              : require("@/assets/clubs/default_club_logo.png")
          }
          style={[
            styles.teamLogo,
            {
              backgroundColor: theme.text,
            },
          ]}
        />
        <Text
          style={[
            styles.teamName,
            {
              color: theme.text,
            },
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {team.shortName}
        </Text>
      </View>

      <View
        style={styles.finalScoreColumn}
      >
        <GradientBorderView
          gradient={gradient}
          borderRadius={10}
          borderWidth={1}
          style={[
            styles.finalScoreBox,
            {
              backgroundColor: theme.background,
            },
          ]}
        >
          <Text
            style={[
              styles.finalScoreText,
              {
                color: theme.text,
              },
            ]}
          >
            {finalScore}
          </Text>
        </GradientBorderView>
      </View>

      {Array.from({length: maxSets}).map((_, i) => {
        const val = sets[i];
        const opp = opponentSets[i];
        const played = Number.isFinite(val) && Number.isFinite(opp);
        const isWinner = played ? val > opp : false;
        return (
          <View
            key={`s-${i}`}
            style={styles.setColumn}
          >
            <Text
              style={[
                styles.setScoreText,
                isWinner
                  ? {color: theme.text, fontWeight: "800"}
                  : {color: theme.textInactive, fontWeight: "600"},
              ]}
            >
              {played ? val : "—"}
            </Text>
          </View>
        );
      })}
    </Pressable>
  );

  return (
    <GradientBorderView
      gradient={gradient}
      borderRadius={RADIUS}
      borderWidth={1}
      style={[
        styles.card,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      {maxSets > 0 ? <HeaderRow/> : null}

      <View
        style={styles.rows}
      >
        <TeamRow
          team={enrichedMatch.teamA}
          finalScore={homeFinal}
          sets={homeSets}
          opponentSets={awaySets}
        />
        <TeamRow
          team={enrichedMatch.teamB}
          finalScore={awayFinal}
          sets={awaySets}
          opponentSets={homeSets}
        />
      </View>
    </GradientBorderView>
  );
};

export default MatchScoreDetailsCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS,
    padding: 14,
    gap: 16,
  },
  rows: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  identityBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerScoreText: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  teamLogo: {
    width: LOGO,
    aspectRatio: 1,
    borderRadius: 8,
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  finalScoreColumn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  finalScoreBox: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
  },
  finalScoreText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  setColumn: {
    width: SET_COL_W,
    alignItems: "center",
    justifyContent: "center",
  },
  setHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  setScoreText: {
    fontSize: 16,
  },
});

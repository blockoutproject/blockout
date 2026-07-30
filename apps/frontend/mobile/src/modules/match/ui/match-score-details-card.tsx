import React, { useCallback } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MatchResponse } from "@/src/shared/generated/models";
import type { TeamDetailsResponse } from "@/src/shared/generated/models";
import {
  borderWidth,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";
import { createMatchScoreBreakdown } from "@/src/modules/match/view-models/match-score-presentation";

/** Per-set score breakdown. */
export type MatchScoreDetailsCardProps = {
  /** Match returned by the mobile gateway. */
  match: MatchResponse;
};

const LOGO = 30;
const SET_COL_W = 32;

const MatchScoreDetailsCard: React.FC<MatchScoreDetailsCardProps> = ({
  match,
}) => {
  const theme = useAppTheme();
  const router = useRouter();
  const { handleNavigationWithAd } = useAdvertising();

  const gradient = [
    match.pool.division.firstGradientColor,
    match.pool.division.secondGradientColor,
    match.pool.division.thirdGradientColor,
  ] as const;

  const { awayFinal, awaySets, homeFinal, homeSets, maxSets } =
    createMatchScoreBreakdown(match);

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

  const HeaderRow: React.FC = () => (
    <View style={styles.row}>
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
      <View style={styles.identityBlock} />
      {Array.from({ length: maxSets }).map((_, i) => (
        <View key={`h-${i}`} style={styles.setColumn}>
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
    team: TeamDetailsResponse;
    /** Final set count for team. */
    finalScore: string;
    /** Points per set. */
    sets: number[];
    /** Opponent points per set. */
    opponentSets: number[];
  }> = ({ team, finalScore, sets, opponentSets }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir l'équipe ${team.shortName}`}
      testID={`match-score-team-action-${team.id}`}
      style={({ pressed }) => [
        styles.row,
        pressed ? styles.pressed : undefined,
      ]}
      onPress={() => handleTeamPress(team.id)}
    >
      <View style={styles.identityBlock}>
        <Image
          source={
            team.logoUrl
              ? { uri: team.logoUrl }
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

      <View style={styles.finalScoreColumn}>
        <GradientBorderView
          gradient={gradient}
          borderRadius={radius.md}
          borderWidth={borderWidth.thin}
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

      {Array.from({ length: maxSets }).map((_, i) => {
        const val = sets[i];
        const opp = opponentSets[i];
        const played = Number.isFinite(val) && Number.isFinite(opp);
        const isWinner = played ? val > opp : false;
        return (
          <View key={`s-${i}`} style={styles.setColumn}>
            <Text
              style={[
                styles.setScoreText,
                isWinner
                  ? { color: theme.text, fontWeight: "800" }
                  : { color: theme.textInactive, fontWeight: "600" },
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
      borderRadius={radius.hero}
      borderWidth={borderWidth.thin}
      style={[
        styles.card,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      {maxSets > 0 ? <HeaderRow /> : null}

      <View style={styles.rows}>
        <TeamRow
          team={match.teamA}
          finalScore={homeFinal}
          sets={homeSets}
          opponentSets={awaySets}
        />
        <TeamRow
          team={match.teamB}
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
    borderRadius: radius.hero,
    padding: spacing[4],
    gap: spacing[4],
  },
  rows: {
    gap: spacing[3],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  identityBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  headerScoreText: {
    ...typography.compactStrong,
    textTransform: "uppercase",
  },
  teamLogo: {
    width: LOGO,
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  teamName: {
    flex: 1,
    ...typography.bodyStrong,
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
    minHeight: 34,
    borderRadius: radius.md,
  },
  finalScoreText: {
    ...typography.control,
    textAlign: "center",
  },
  setColumn: {
    width: SET_COL_W,
    alignItems: "center",
    justifyContent: "center",
  },
  setHeaderText: {
    ...typography.metadataStrong,
    textTransform: "uppercase",
  },
  setScoreText: {
    ...typography.control,
  },
  pressed: { opacity: 0.85 },
});

import React, {useCallback, useMemo} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import * as Haptics from "expo-haptics";
import {useAppTheme} from "@/src/shared/theme";
import {splitIsoDateFormatted, withAlpha} from "@/src/shared/lib/utils";
import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import {
  type MatchResponse,
  MatchStatusEnum,
  type TeamDetailsResponse,
} from "@/src/shared/generated/models";
import {
  GradientPill,
  Pill,
  type PillProps,
} from "@/src/shared/ui/pill";
import MaskedImage from "@/src/shared/ui/images/MaskedImage";
import {useRouter} from "expo-router";
import {useNavigationInterstitial} from "@/src/modules/advertising/useNavigationInterstitial";

export interface MatchScoreCardProps {
  match: MatchResponse;
  gradient: readonly [string, string, ...string[]];
}

const LOGO_SIZE = 84;
const RADIUS = 20;

const MatchScoreCard: React.FC<MatchScoreCardProps> = ({match, gradient}) => {
  const theme = useAppTheme();
  const router = useRouter();
  const {date, time} = splitIsoDateFormatted(match.matchDate);
  const {handleNavigationWithAd} = useNavigationInterstitial();

  const hasLiveLink = !!match.liveUrl;
  const isFinished = match.status === MatchStatusEnum.FINISHED;

  const isMatchStarted = useMemo(() => {
    const matchMs = new Date(match.matchDate).getTime();
    if (Number.isNaN(matchMs)) return false;
    return Date.now() >= matchMs;
  }, [match.matchDate]);

  const handleTeamPress = useCallback(
    async (teamId: number) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/team/${teamId}`);
      });
    },
    [router, handleNavigationWithAd]
  );

  const TeamBlock: React.FC<{
    team: TeamDetailsResponse;
    role: "Locaux" | "Visiteurs";
  }> = ({team, role}) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir l'équipe ${team.shortName}`}
      onPress={() => handleTeamPress(team.id)}
      style={styles.teamCard}
      testID={`match-team-action-${team.id}`}
    >
      <MaskedImage uri={team.logoUrl ?? null} size={LOGO_SIZE} radius={RADIUS} shadow/>
      <Text style={[styles.teamLabel, {color: theme.text}]} numberOfLines={2}>
        {team.shortName}
      </Text>
      <Text style={[styles.teamRoleLabel, {color: theme.textInactive}]}>{role}</Text>
    </Pressable>
  );

  const BasicPill = ({label, icon, redDot}: {
    label: string;
    icon?: PillProps["leftIcon"];
    redDot?: boolean;
  }) => (
    <Pill
      label={label}
      leftIcon={icon}
      borderWidth={1}
      backgroundColor={theme.surface}
      borderColor={withAlpha(theme.text, 0.12)}
      textColor={theme.text}
      showRedDot={redDot}
    />
  );

  return (
    <GradientBorderView
      gradient={gradient}
      borderRadius={RADIUS}
      borderWidth={1}
      style={[styles.card, {backgroundColor: theme.background}]}
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.headerSideLeft}>
          <BasicPill label={match.pool.division.name}/>
        </View>

        <View style={styles.headerCenter}>
          {hasLiveLink && !isFinished ? (
            <BasicPill label="Live" icon="video-outline" redDot/>
          ) : null}
        </View>

        <View style={styles.headerSideRight}>
          {date ? <BasicPill label={date}/> : null}
        </View>
      </View>

      {/* TEAMS */}
      <View style={styles.teamsRow}>
        <TeamBlock team={match.teamA} role="Locaux"/>

        <View style={styles.centerBlock}>
          {match.set ? (
            <>
              <GradientBorderView
                gradient={gradient}
                borderRadius={16}
                borderWidth={2}
                style={[styles.finalScoreBox, {backgroundColor: theme.background}]}
              >
                <Text style={[styles.finalScoreText, {color: theme.text}]}>
                  {match.set}
                </Text>
              </GradientBorderView>

              {time ? <BasicPill label={time}/> : null}
            </>
          ) : (
            <>
              {time ? (
                <Text style={[styles.timeLarge, {color: theme.text}]}>{time}</Text>
              ) : null}

              {!isMatchStarted ? (
                <GradientPill
                  label="À venir"
                  gradient={gradient}
                />
              ) : null}
            </>
          )}
        </View>

        <TeamBlock team={match.teamB} role="Visiteurs"/>
      </View>
    </GradientBorderView>
  );
};

export default MatchScoreCard;

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerSideLeft: {flex: 1, alignItems: "flex-start"},
  headerCenter: {alignItems: "center", justifyContent: "center", paddingHorizontal: 4},
  headerSideRight: {flex: 1, alignItems: "flex-end"},

  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamCard: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  teamRoleLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  centerBlock: {
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  finalScoreBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  finalScoreText: {
    fontSize: 28,
    fontWeight: "800",
  },
  timeLarge: {
    fontSize: 32,
    fontWeight: "800",
  },
});

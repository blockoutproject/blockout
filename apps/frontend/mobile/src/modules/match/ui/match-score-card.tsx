import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  borderWidth,
  radius,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import {
  type MatchResponse,
  type TeamDetailsResponse,
} from "@/src/shared/generated/models";
import { GradientPill, Pill, type PillProps } from "@/src/shared/ui/pill";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { useRouter } from "expo-router";
import { useNavigationInterstitial } from "@/src/modules/advertising/hooks/use-navigation-interstitial";
import { createMatchStatusPresentation } from "@/src/modules/match/view-models/match-score-presentation";

export interface MatchScoreCardProps {
  match: MatchResponse;
  gradient: readonly [string, string, ...string[]];
}

const LOGO_SIZE = 84;
const MatchScoreCard: React.FC<MatchScoreCardProps> = ({ match, gradient }) => {
  const theme = useAppTheme();
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();
  const presentation = useMemo(
    () =>
      createMatchStatusPresentation({
        liveUrl: match.liveUrl,
        matchDate: match.matchDate,
        status: match.status,
      }),
    [match.liveUrl, match.matchDate, match.status],
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

  const TeamBlock: React.FC<{
    team: TeamDetailsResponse;
    role: "Locaux" | "Visiteurs";
  }> = ({ team, role }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir l'équipe ${team.shortName}`}
      onPress={() => handleTeamPress(team.id)}
      style={styles.teamCard}
      testID={`match-team-action-${team.id}`}
    >
      <MaskedImage
        uri={team.logoUrl ?? null}
        size={LOGO_SIZE}
        radius={radius.hero}
        shadow
      />
      <Text style={[styles.teamLabel, { color: theme.text }]} numberOfLines={2}>
        {team.shortName}
      </Text>
      <Text style={[styles.teamRoleLabel, { color: theme.textInactive }]}>
        {role}
      </Text>
    </Pressable>
  );

  const BasicPill = ({
    label,
    icon,
    redDot,
  }: {
    label: string;
    icon?: PillProps["leftIcon"];
    redDot?: boolean;
  }) => (
    <Pill
      label={label}
      leftIcon={icon}
      borderWidth={borderWidth.thin}
      backgroundColor={theme.surface}
      borderColor={withAlpha(theme.text, 0.12)}
      textColor={theme.text}
      showRedDot={redDot}
    />
  );

  return (
    <GradientBorderView
      gradient={gradient}
      borderRadius={radius.hero}
      borderWidth={borderWidth.thin}
      style={[styles.card, { backgroundColor: theme.background }]}
    >
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.headerSideLeft}>
          <BasicPill label={match.pool.division.name} />
        </View>

        <View style={styles.headerCenter}>
          {presentation.hasLiveLink && !presentation.isFinished ? (
            <BasicPill label="Live" icon="video-outline" redDot />
          ) : null}
        </View>

        <View style={styles.headerSideRight}>
          {presentation.date ? <BasicPill label={presentation.date} /> : null}
        </View>
      </View>

      {/* TEAMS */}
      <View style={styles.teamsRow}>
        <TeamBlock team={match.teamA} role="Locaux" />

        <View style={styles.centerBlock}>
          {match.set ? (
            <>
              <GradientBorderView
                gradient={gradient}
                borderRadius={radius.lg}
                borderWidth={borderWidth.medium}
                style={[
                  styles.finalScoreBox,
                  { backgroundColor: theme.background },
                ]}
              >
                <Text style={[styles.finalScoreText, { color: theme.text }]}>
                  {match.set}
                </Text>
              </GradientBorderView>

              {presentation.time ? (
                <BasicPill label={presentation.time} />
              ) : null}
            </>
          ) : (
            <>
              {presentation.time ? (
                <Text style={[styles.timeLarge, { color: theme.text }]}>
                  {presentation.time}
                </Text>
              ) : null}

              {!presentation.isMatchStarted ? (
                <GradientPill label="À venir" gradient={gradient} />
              ) : null}
            </>
          )}
        </View>

        <TeamBlock team={match.teamB} role="Visiteurs" />
      </View>
    </GradientBorderView>
  );
};

export default MatchScoreCard;

const styles = StyleSheet.create({
  card: {
    padding: spacing[3],
    borderRadius: radius.hero,
    gap: spacing[4],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerSideLeft: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerSideRight: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  teamsRow: {
    height: 148,
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing[2],
  },
  teamCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  teamLabel: {
    ...typography.compactStrong,
    textAlign: "center",
  },
  teamRoleLabel: {
    ...typography.metadataStrong,
  },
  centerBlock: {
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  finalScoreBox: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  finalScoreText: {
    ...typography.display,
  },
  timeLarge: {
    ...typography.display,
  },
});

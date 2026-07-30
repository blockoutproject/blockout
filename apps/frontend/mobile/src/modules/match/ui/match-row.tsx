import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  type DivisionResponse,
  type MatchResponse,
} from "@/src/shared/generated/models";
import {
  borderWidth,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { Pill } from "@/src/shared/ui/pill";
import { createMatchRowPresentation } from "@/src/modules/match/view-models/match-score-presentation";

export type MatchRowProps = {
  match: MatchResponse;
  division: DivisionResponse;
};

const MatchRow: React.FC<MatchRowProps> = ({ match, division }) => {
  const theme = useAppTheme();
  const presentation = createMatchRowPresentation(match);

  const gradient = [
    division.firstGradientColor,
    division.secondGradientColor,
    division.thirdGradientColor,
  ] as const;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      testID={`match-row-${match.id}`}
    >
      {presentation.livePillLabel ? (
        <View style={styles.topRow}>
          <Pill
            label={presentation.livePillLabel}
            leftIcon="video-outline"
            size="sm"
            borderWidth={borderWidth.thin}
            backgroundColor={theme.background}
            borderColor={theme.border}
            textColor={theme.text}
            showRedDot={!presentation.isFinished}
            style={styles.livePill}
            labelStyle={styles.livePillText}
          />
        </View>
      ) : null}

      <View style={styles.mainRow}>
        <View style={[styles.team, styles.teamRight]}>
          <Text
            style={[styles.teamName, { color: theme.text }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {match.teamA.shortName}
          </Text>

          <MaskedImage uri={match.teamA.logoUrl} size={28} radius={8} />
        </View>

        <View style={styles.center}>
          {presentation.isUpcoming ? (
            <View
              style={[
                styles.timePill,
                {
                  backgroundColor: theme.surfaceSecondary,
                  borderColor: theme.borderSecondary,
                },
              ]}
            >
              <Text style={[styles.timeText, { color: theme.text }]}>
                {presentation.time}
              </Text>
            </View>
          ) : (
            <GradientBorderView
              gradient={gradient}
              borderRadius={radius.card}
              borderWidth={borderWidth.thin}
            >
              <View style={styles.scoreBox}>
                <Text style={[styles.scoreText, { color: theme.text }]}>
                  {match.set || "-"}
                </Text>
              </View>
            </GradientBorderView>
          )}
        </View>

        <View style={[styles.team, styles.teamLeft]}>
          <MaskedImage uri={match.teamB.logoUrl} size={28} radius={8} />

          <Text
            style={[styles.teamName, { color: theme.text }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {match.teamB.shortName}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default React.memo(MatchRow);

const styles = StyleSheet.create({
  card: {
    minHeight: 54,
    borderRadius: radius.card,
    borderCurve: "continuous",
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing[2],
    paddingVertical: 10,
    gap: 6,
  },
  topRow: {
    marginTop: -4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  mainRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  team: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  teamRight: {
    justifyContent: "flex-end",
  },
  teamLeft: {
    justifyContent: "flex-start",
  },
  teamName: {
    ...typography.compactStrong,
    textAlign: "center",
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[1],
  },
  timePill: {
    minHeight: 34,
    paddingHorizontal: spacing[2],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  timeText: {
    ...typography.compactStrong,
  },
  scoreBox: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    ...typography.title,
  },
  livePill: {
    paddingHorizontal: spacing[2],
  },
  livePillText: {
    ...typography.captionStrong,
  },
});

import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/shared/theme";
import { MatchLiveSummaryResponse } from "@/src/shared/generated/models";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import {
  formatModerationDateTime,
  getLiveLinkStatusPresentation,
} from "@/src/modules/match/view-models/live-link-moderation";

type Props = {
  match: MatchLiveSummaryResponse;
  onPress: (match: MatchLiveSummaryResponse) => void;
};

const CARD_RADIUS = 16;

const MatchLiveModerationItem: React.FC<Props> = ({ match, onPress }) => {
  const theme = useAppTheme();

  const teamALabel = match.teamA.shortName ?? match.teamA.name;
  const teamBLabel = match.teamB.shortName ?? match.teamB.name;

  const matchDateLabel = formatModerationDateTime(match.matchDate);
  const lastLinkCreatedLabel = match.lastLiveLinkCreatedAt
    ? formatModerationDateTime(match.lastLiveLinkCreatedAt)
    : "";
  const statusConfig = getLiveLinkStatusPresentation(
    match.lastLiveLinkStatus,
    theme,
  );
  const gradient = [
    match.pool.division.firstGradientColor,
    match.pool.division.secondGradientColor,
    match.pool.division.thirdGradientColor,
  ] as const;

  const handlePress = useCallback(async () => {
    await Haptics.selectionAsync();
    onPress(match);
  }, [match, onPress]);

  return (
    <View style={styles.wrapper}>
      <GradientBorderView
        gradient={gradient}
        borderRadius={CARD_RADIUS}
        borderWidth={1}
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir la modération du match ${teamALabel} contre ${teamBLabel}`}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.cardContent,
            pressed ? styles.pressed : undefined,
          ]}
          testID={`match-moderation-item-${match.id}`}
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: statusConfig.backgroundColor },
              ]}
            >
              <MaterialCommunityIcons
                name={statusConfig.icon}
                size={13}
                color={statusConfig.color}
              />
              <Text
                style={[styles.statusText, { color: statusConfig.color }]}
                numberOfLines={1}
              >
                {statusConfig.label}
              </Text>
            </View>

            <View style={styles.headerMeta}>
              <Text
                style={[styles.headerTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {match.pool.shortName} · {match.pool.division.name}
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: theme.textInactive }]}
                numberOfLines={1}
              >
                {match.pool.leagueName} · {match.season}
              </Text>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.textInactive}
            />
          </View>

          <View style={styles.teamsRow}>
            <View style={styles.teamColumnLeft}>
              <MaskedImage
                uri={match.teamA.logoUrl}
                size={32}
                radius={10}
                shadow
              />
              <Text
                style={[styles.teamName, { color: theme.text }]}
                numberOfLines={2}
              >
                {teamALabel}
              </Text>
            </View>

            <View style={styles.centerBlock}>
              {match.set ? (
                <GradientBorderView
                  gradient={gradient}
                  borderRadius={14}
                  borderWidth={1.5}
                  style={[
                    styles.scoreBox,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <Text style={[styles.scoreText, { color: theme.text }]}>
                    {match.set}
                  </Text>
                </GradientBorderView>
              ) : (
                <Text style={[styles.vsText, { color: theme.textInactive }]}>
                  vs
                </Text>
              )}
            </View>

            <View style={styles.teamColumnRight}>
              <Text
                style={[styles.teamName, { color: theme.text }]}
                numberOfLines={2}
              >
                {teamBLabel}
              </Text>
              <MaskedImage
                uri={match.teamB.logoUrl}
                size={32}
                radius={10}
                shadow
              />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={theme.textInactive}
              />
              <Text
                style={[styles.metaText, { color: theme.textInactive }]}
                numberOfLines={1}
              >
                Match : {matchDateLabel}
              </Text>
            </View>

            {!!lastLinkCreatedLabel && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="video-outline"
                  size={14}
                  color={theme.textInactive}
                />
                <Text
                  style={[styles.metaText, { color: theme.textInactive }]}
                  numberOfLines={1}
                >
                  Dernier lien : {lastLinkCreatedLabel}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </GradientBorderView>
    </View>
  );
};

export default memo(MatchLiveModerationItem);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  card: {
    borderRadius: CARD_RADIUS,
  },
  cardContent: {
    borderRadius: CARD_RADIUS - 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: { opacity: 0.9 },
  headerMeta: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  teamColumnLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamColumnRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  scoreBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "800",
  },
  vsText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaRow: {
    gap: 2,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    flexShrink: 1,
  },
});

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import {
  borderWidth,
  radius,
  spacing,
  typography,
  type AppTheme,
} from "@/src/shared/theme";
import type { TeamWithStatsResponse } from "@/src/shared/generated/models";
import type { TeamHighlight } from "@/src/modules/team/model/team-highlight";
import { withAlpha } from "@/src/shared/lib/utils";
import MiniStat from "./mini-stat";
import Medal from "./medal";

const LOGO = 28;

type Props = {
  item: TeamWithStatsResponse;
  index: number;
  theme: AppTheme;
  highlightTeams?: TeamHighlight[];
  gradient: readonly [string, string, ...string[]];
  onPress: (teamId: number) => void;
};

const RankingRow: React.FC<Props> = ({
  item,
  index,
  theme,
  highlightTeams,
  gradient,
  onPress,
}) => {
  const rank = index + 1;
  const highlight = highlightTeams?.find(({ teamId }) => teamId === item.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir l'équipe ${item.shortName}, classée ${rank}`}
      testID={`ranking-team-item-${item.id}`}
      android_ripple={{ color: withAlpha(theme.text, 0.06) }}
      style={[
        styles.row,
        {
          backgroundColor: highlight
            ? withAlpha(highlight.color, 0.4)
            : "transparent",
          borderWidth: borderWidth.thin,
          borderColor: theme.border,
        },
      ]}
      onPress={() => onPress(item.id)}
    >
      {/* Rank */}
      <View style={styles.rankCell}>
        {rank <= 3 ? (
          <Medal rank={rank as 1 | 2 | 3} theme={theme} />
        ) : (
          <View
            style={[
              styles.rankCircle,
              { borderColor: withAlpha(theme.text, 0.25) },
            ]}
          >
            <Text style={[styles.rankText, { color: theme.text }]}>{rank}</Text>
          </View>
        )}
      </View>

      {/* Team */}
      <View style={styles.teamBlock}>
        <MaskedImage uri={item.logoUrl} size={LOGO} radius={8} shadow />
        <View style={styles.teamTextCol}>
          <Text
            style={[styles.teamName, { color: theme.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.9}
          >
            {item.shortName}
          </Text>
          <View style={styles.metaRow}>
            <MiniStat label="MJ" value={item.played} theme={theme} />
            <MiniStat label="V" value={item.wins} theme={theme} />
            <MiniStat label="D" value={item.losses} theme={theme} />
          </View>
        </View>
      </View>

      {/* Points */}
      <GradientBorderView
        gradient={gradient}
        borderRadius={radius.md}
        borderWidth={borderWidth.thin}
        style={[styles.pointsBadge, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.pointsText, { color: theme.text }]}>
          {item.points}
        </Text>
      </GradientBorderView>
    </Pressable>
  );
};

export default RankingRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    borderRadius: radius.md,
    marginHorizontal: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: 10,
    gap: spacing[2],
    overflow: "hidden",
  },
  rankCell: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rankCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidth.thin,
  },
  rankText: {
    ...typography.label,
    textAlign: "center",
  },
  teamBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  teamTextCol: { flex: 1, gap: spacing[1] },
  teamName: {
    ...typography.compactStrong,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pointsBadge: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  pointsText: {
    ...typography.compactStrong,
    textAlign: "center",
  },
});

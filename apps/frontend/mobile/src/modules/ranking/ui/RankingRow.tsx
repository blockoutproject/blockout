import React from "react";
import {Pressable, StyleSheet, StyleSheet as RNStyleSheet, Text, View} from "react-native";

import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import MaskedImage from "@/src/shared/ui/images/MaskedImage";
import type {AppTheme} from "@/src/shared/theme";
import type {TeamWithStatsResponse} from "@/src/shared/generated/models";
import type {TeamHighlight} from "@/src/modules/team/model/TeamHighlight";
import {withAlpha} from "@/src/shared/lib/utils";
import MiniStat from "./MiniStat";
import Medal from "./Medal";

const LOGO = 28;
const PTS_BADGE_RADIUS = 10;

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
  const highlight = highlightTeams?.find(({teamId}) => teamId === item.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir l'équipe ${item.shortName}, classée ${rank}`}
      testID={`ranking-team-item-${item.id}`}
      android_ripple={{color: withAlpha(theme.text, 0.06)}}
      style={[
        styles.row,
        {
          backgroundColor: highlight
            ? withAlpha(highlight.color, 0.4)
            : "transparent",
          borderWidth: RNStyleSheet.hairlineWidth,
          borderColor: withAlpha(theme.text, 0.15),
        },
      ]}
      onPress={() => onPress(item.id)}
    >
      {/* Rank */}
      <View style={styles.rankCell}>
        {rank <= 3 ? (
          <Medal rank={rank as 1 | 2 | 3} theme={theme}/>
        ) : (
          <View
            style={[
              styles.rankCircle,
              {borderColor: withAlpha(theme.text, 0.25)},
            ]}
          >
            <Text style={[styles.rankText, {color: theme.text}]}>{rank}</Text>
          </View>
        )}
      </View>

      {/* Team */}
      <View style={styles.teamBlock}>
        <MaskedImage uri={item.logoUrl} size={LOGO} radius={8} shadow/>
        <View style={styles.teamTextCol}>
          <Text
            style={[styles.teamName, {color: theme.text}]}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.9}
          >
            {item.shortName}
          </Text>
          <View style={styles.metaRow}>
            <MiniStat label="MJ" value={item.played} theme={theme}/>
            <MiniStat label="V" value={item.wins} theme={theme}/>
            <MiniStat label="D" value={item.losses} theme={theme}/>
          </View>
        </View>
      </View>

      {/* Points */}
      <GradientBorderView
        gradient={gradient}
        borderRadius={PTS_BADGE_RADIUS}
        borderWidth={1}
        style={[styles.pointsBadge, {backgroundColor: theme.background}]}
      >
        <Text style={[styles.pointsText, {color: theme.text}]}>{item.points}</Text>
      </GradientBorderView>
    </Pressable>
  );
};

export default RankingRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 8,
    overflow: "hidden",
  },
  rankCell: {width: 40, alignItems: "center", justifyContent: "center"},
  rankCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: RNStyleSheet.hairlineWidth,
  },
  rankText: {fontSize: 13, fontWeight: "800"},
  teamBlock: {flex: 1, flexDirection: "row", alignItems: "center", gap: 8},
  teamTextCol: {flex: 1, gap: 4},
  teamName: {fontSize: 14, fontWeight: "700"},
  metaRow: {flexDirection: "row", alignItems: "center", gap: 6},
  pointsBadge: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: PTS_BADGE_RADIUS,
  },
  pointsText: {fontSize: 14, fontWeight: "800", letterSpacing: 0.3},
});
